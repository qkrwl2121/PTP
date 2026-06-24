const STORAGE_KEY = "strength-deck-state-v1";
const VERSION_KEY = "strength-deck-app-version";

const lifts = {
  backSquat: "백스쿼트",
  frontSquat: "프론트스쿼트",
  deadlift: "데드리프트",
  pushPress: "푸시프레스",
  snatch: "스내치",
  cleanJerk: "클린 & 저크",
};

const defaultProfile = {
  nickname: "나",
  gender: "female",
  height: 160,
  weight: 50,
  unit: "kg",
  days: 6,
  goal: "olympic",
  recovery: "normal",
  intensity: "normal",
};

const state = normalizeState(loadState());
const account = {
  user: null,
  syncTimer: null,
  syncing: false,
};
let calendarCursor = new Date();
let selectedCalendarDate = isoDate(new Date());
let selectedPlanWeek = 1;
let selectedPlanDayOffset = 0;

const panels = {
  today: document.querySelector("#todayStep"),
  maxes: document.querySelector("#maxesStep"),
  plan: document.querySelector("#planStep"),
  myPage: document.querySelector("#myPageStep"),
  calendar: document.querySelector("#calendarStep"),
};

document.querySelector("#profileButton")?.addEventListener("click", openProfile);
document.querySelectorAll("[data-close-profile]").forEach((button) => button.addEventListener("click", closeProfile));
document.querySelectorAll("[data-drawer-view]").forEach((button) => {
  button.addEventListener("click", () => showDrawerView(button.dataset.drawerView));
});

document.querySelectorAll(".appbar-item").forEach((button) => {
  button.addEventListener("click", () => showStep(button.dataset.step));
});

document.querySelector("#openMaxesFromPlan")?.addEventListener("click", () => showStep("maxes"));
document.querySelector("#backToPlanFromMaxes")?.addEventListener("click", () => showStep("plan"));

document.querySelector("#loginForm")?.addEventListener("submit", (event) => {
  event.preventDefault();
  submitAuthForm("login", event.currentTarget);
});

document.querySelector("#logoutButton")?.addEventListener("click", logoutAccount);
document.querySelector("#syncNow")?.addEventListener("click", () => pushRemoteState(true));

document.querySelector("#addUserForm")?.addEventListener("submit", (event) => {
  event.preventDefault();
  const form = event.currentTarget;
  const nickname = new FormData(form).get("nickname")?.toString().trim() || "새 사용자";
  const user = createUser(nickname);
  state.users.push(user);
  state.activeUserId = user.id;
  saveState("사용자를 추가했습니다.");
  form.reset();
  hydrateForms();
  renderAll();
});

document.querySelector("#userCardList")?.addEventListener("click", (event) => {
  const deleteButton = event.target.closest("[data-delete-user-id]");
  if (deleteButton) {
    deleteUser(deleteButton.dataset.deleteUserId);
    return;
  }

  const button = event.target.closest("[data-user-id]");
  if (!button) return;
  state.activeUserId = button.dataset.userId;
  selectedCalendarDate = isoDate(new Date());
  saveState(`${activeUser().profile.nickname} 데이터로 전환했습니다.`);
  hydrateForms();
  renderAll();
  showDrawerView("profile");
  animateUserSwitch();
});

document.querySelector("#profileForm")?.addEventListener("submit", (event) => {
  event.preventDefault();
  const user = activeUser();
  const previousUnit = unit(user.profile);
  user.profile = normalizeProfile(Object.fromEntries(new FormData(event.currentTarget).entries()));
  if (unit(user.profile) !== previousUnit) convertStoredWeights(user, previousUnit, unit(user.profile));
  rebuildPlanIfPossible(user);
  saveState("프로필을 저장했습니다.");
  hydrateForms();
  renderAll();
});

document.querySelector("#unitSelect")?.addEventListener("change", (event) => {
  const user = activeUser();
  const nextUnit = event.currentTarget.value;
  const previousUnit = unit(user.profile);
  if (nextUnit === previousUnit) return;
  user.profile.unit = nextUnit;
  convertStoredWeights(user, previousUnit, nextUnit);
  rebuildPlanIfPossible(user);
  saveState(`단위를 ${nextUnit}로 변경했습니다.`);
  hydrateForms();
  renderAll();
});

document.querySelector("#maxForm")?.addEventListener("submit", (event) => {
  event.preventDefault();
  const user = activeUser();
  user.maxes = Object.fromEntries(new FormData(event.currentTarget).entries());
  Object.keys(user.maxes).forEach((key) => {
    user.maxes[key] = number(user.maxes[key]);
  });
  rebuildPlanIfPossible(user);
  saveState("1RM과 프로그램을 저장했습니다.");
  renderAll();
  showStep("plan");
});

document.querySelector("#completeSession")?.addEventListener("click", () => {
  const user = activeUser();
  if (!user.plan?.sessions?.length) {
    showStep("maxes");
    return;
  }

  const today = isoDate(new Date());
  const doneSets = document.querySelectorAll("#todaySession input:checked").length;
  const totalSets = document.querySelectorAll("#todaySession input").length;
  if (totalSets > 0 && doneSets < totalSets) {
    showToast("위 세트를 모두 체크하면 완료할 수 있습니다.");
    return;
  }
  const session = user.plan.sessions[0];
  user.todayChecks = user.todayChecks || {};
  user.completedDates[today] = true;
  user.history = (user.history || []).filter((item) => item.isoDate !== today);
  user.history.unshift({
    isoDate: today,
    date: new Date().toLocaleDateString("ko-KR"),
    title: session.title,
    doneSets: doneSets || totalSets,
    totalSets,
    unit: unit(user.profile),
    lifts: session.lifts.map((lift) => ({
      name: lift.name,
      summary: lift.accessory
        ? lift.sets.map((set) => set.text).join(", ")
        : lift.sets.map((set) => `${set.percent}% ${set.sets}x${set.reps} ${set.weight}${unit(user.profile)}`).join(", "),
    })),
  });
  user.history = user.history.slice(0, 30);
  selectedCalendarDate = today;
  saveState("오늘 스트렝스를 완료했습니다.");
  launchConfetti();
  renderAll();
  showStep("calendar");
});

document.querySelector("#undoCompleteSession")?.addEventListener("click", () => {
  undoCompletion(isoDate(new Date()));
});

document.querySelector("#todaySession")?.addEventListener("change", (event) => {
  if (!event.target.matches("[data-check-id]")) return;
  const user = activeUser();
  const today = isoDate(new Date());
  user.todayChecks = user.todayChecks || {};
  user.todayChecks[today] = user.todayChecks[today] || {};
  user.todayChecks[today][event.target.dataset.checkId] = event.target.checked;
  saveState("", false);
  renderTodaySession();
});

document.querySelector("#prevMonth")?.addEventListener("click", () => {
  calendarCursor = new Date(calendarCursor.getFullYear(), calendarCursor.getMonth() - 1, 1);
  renderCalendar();
});

document.querySelector("#nextMonth")?.addEventListener("click", () => {
  calendarCursor = new Date(calendarCursor.getFullYear(), calendarCursor.getMonth() + 1, 1);
  renderCalendar();
});

document.querySelector("#calendarGrid")?.addEventListener("click", (event) => {
  const button = event.target.closest("[data-date]");
  if (!button) return;
  selectedCalendarDate = button.dataset.date;
  renderCalendar();
});

document.querySelector("#calendarDetail")?.addEventListener("click", (event) => {
  const button = event.target.closest("[data-undo-date]");
  if (!button) return;
  undoCompletion(button.dataset.undoDate);
});

const weekSelect = document.querySelector("#weekSelect");
if (weekSelect) {
  weekSelect.addEventListener("change", (event) => {
    selectedPlanWeek = Number(event.currentTarget.value);
    renderPlan();
  });
}

const legacyWeekTabs = document.querySelector("#weekTabs");
if (legacyWeekTabs) {
  legacyWeekTabs.addEventListener("click", (event) => {
    const button = event.target.closest("[data-week]");
    if (!button) return;
    selectedPlanWeek = Number(button.dataset.week);
    renderPlan();
  });
}

document.querySelector("#dateTabs")?.addEventListener("click", (event) => {
  const button = event.target.closest("[data-offset]");
  if (!button) return;
  selectedPlanDayOffset = Number(button.dataset.offset);
  renderPlan();
});

document.querySelector("#exportData")?.addEventListener("click", () => {
  const data = JSON.stringify({ exportedAt: new Date().toISOString(), app: "strength-deck", state }, null, 2);
  const blob = new Blob([data], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `strength-deck-backup-${isoDate(new Date())}.json`;
  link.click();
  URL.revokeObjectURL(url);
  showToast("백업 파일을 내보냈습니다.");
});

document.querySelector("#importData")?.addEventListener("change", async (event) => {
  const file = event.currentTarget.files?.[0];
  if (!file) return;
  try {
    const parsed = JSON.parse(await file.text());
    replaceState(normalizeState(parsed.state || parsed));
    saveState("데이터를 가져왔습니다.", false);
    hydrateForms();
    renderAll();
    closeProfile();
    showToast("데이터를 가져왔습니다.");
  } catch {
    showToast("가져오기 파일을 읽을 수 없습니다.");
  } finally {
    event.currentTarget.value = "";
  }
});

document.querySelector("#resetData")?.addEventListener("click", () => {
  const ok = window.confirm("모든 사용자, 프로필, 1RM, 완료 기록을 이 기기에서 삭제할까요?");
  if (!ok) return;
  replaceState(normalizeState({}));
  selectedCalendarDate = isoDate(new Date());
  saveState("데이터를 초기화했습니다.");
  hydrateForms();
  renderAll();
});

initializeAppUpdates();

hydrateForms();
renderAll();
showStep("today");
initializeAccount();

async function initializeAccount() {
  renderAccount();
  try {
    const data = await apiRequest("/api/auth/me");
    account.user = data.user || null;
    renderAccount();
    if (account.user) await pullRemoteState();
  } catch {
    renderAccount("동기화 서버에 연결할 수 없습니다. 이 기기 데이터는 계속 사용할 수 있습니다.");
  }
}

async function submitAuthForm(mode, form) {
  const body = Object.fromEntries(new FormData(form).entries());
  try {
    const data = await apiRequest(`/api/auth/${mode}`, {
      method: "POST",
      body: JSON.stringify(body),
    });
    account.user = data.user;
    form.reset();
    renderAccount();
    await pullRemoteState(true);
    showToast("로그인했습니다.");
  } catch (error) {
    showToast(error.message || "계정 처리에 실패했습니다.");
  }
}

async function logoutAccount() {
  try {
    await apiRequest("/api/auth/logout", { method: "POST" });
  } catch {
    // Local logout should still proceed when the session is already invalid.
  }
  account.user = null;
  renderAccount("로그아웃했습니다. 이 기기 데이터는 유지됩니다.");
  showToast("로그아웃했습니다.");
}

async function pullRemoteState(pushLocalIfEmpty = false) {
  if (!account.user) return;
  try {
    const data = await apiRequest("/api/state");
    if (data.state?.users?.length) {
      replaceState(normalizeState(data.state));
      persistLocalState();
      hydrateForms();
      renderAll();
      renderAccount("서버 데이터를 불러왔습니다.");
      return;
    }
    if (pushLocalIfEmpty) await pushRemoteState(true);
  } catch (error) {
    renderAccount(error.message || "서버 데이터를 불러오지 못했습니다.");
  }
}

function queueRemoteSync() {
  if (!account.user) return;
  window.clearTimeout(account.syncTimer);
  account.syncTimer = window.setTimeout(() => pushRemoteState(false), 700);
}

async function pushRemoteState(showMessage) {
  if (!account.user || account.syncing) return;
  account.syncing = true;
  renderAccount("동기화 중입니다...");
  try {
    await apiRequest("/api/state", {
      method: "PUT",
      body: JSON.stringify({ state }),
    });
    renderAccount("서버에 동기화되었습니다.");
    if (showMessage) showToast("서버에 동기화했습니다.");
  } catch (error) {
    renderAccount(error.message || "서버 동기화에 실패했습니다.");
    if (showMessage) showToast("서버 동기화에 실패했습니다.");
  } finally {
    account.syncing = false;
  }
}

async function apiRequest(path, options = {}) {
  const response = await fetch(path, {
    credentials: "same-origin",
    headers: {
      "content-type": "application/json",
      ...(options.headers || {}),
    },
    ...options,
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.message || "요청을 처리할 수 없습니다.");
  return data;
}

function isLocalDevelopment() {
  return ["localhost", "127.0.0.1", "::1"].includes(window.location.hostname);
}

function isIosDevice() {
  return /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
}

function shouldUseServiceWorker() {
  return !isLocalDevelopment() && !isIosDevice();
}

function initializeAppUpdates() {
  window.addEventListener("load", async () => {
    if (!shouldUseServiceWorker()) {
      const hadController = Boolean(navigator.serviceWorker?.controller);
      await clearAppCaches();
      await checkDeploymentVersion();
      if (hadController && !sessionStorage.getItem("strength-deck-sw-clean-reload")) {
        sessionStorage.setItem("strength-deck-sw-clean-reload", "1");
        window.location.reload();
      }
      return;
    }

    if (!("serviceWorker" in navigator)) {
      await checkDeploymentVersion();
      return;
    }

    let refreshing = false;
    navigator.serviceWorker.addEventListener("controllerchange", () => {
      if (refreshing) return;
      refreshing = true;
      window.location.reload();
    });

    try {
      const registration = await navigator.serviceWorker.register("sw.js");
      await registration.update();
      await checkDeploymentVersion();
      window.setInterval(checkDeploymentVersion, 5 * 60 * 1000);
    } catch {
      showToast("앱 업데이트 확인에 실패했습니다.");
    }
  });

  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible" && !isLocalDevelopment()) checkDeploymentVersion();
  });
}

async function checkDeploymentVersion() {
  try {
    const response = await fetch(`version.json?t=${Date.now()}`, { cache: "no-store" });
    if (!response.ok) return;
    const data = await response.json();
    const nextVersion = String(data.version || "");
    if (!nextVersion) return;

    const currentVersion = localStorage.getItem(VERSION_KEY);
    if (!currentVersion) {
      localStorage.setItem(VERSION_KEY, nextVersion);
      return;
    }

    if (currentVersion !== nextVersion) {
      localStorage.setItem(VERSION_KEY, nextVersion);
      await clearAppCaches();
      window.location.reload();
    }
  } catch {
    // Version checks should never block offline app usage.
  }
}

async function clearAppCaches() {
  if ("serviceWorker" in navigator) {
    const registrations = await navigator.serviceWorker.getRegistrations();
    await Promise.all(registrations.map((registration) => registration.unregister()));
  }
  if ("caches" in window) {
    const keys = await caches.keys();
    await Promise.all(keys.map((key) => caches.delete(key)));
  }
}

function renderAccount(statusMessage) {
  const authStatus = document.querySelector("#authStatus");
  const loginForm = document.querySelector("#loginForm");
  const signupLink = document.querySelector(".auth-signup-link");
  const accountActions = document.querySelector("#accountActions");
  const authTitle = document.querySelector("#authTitle");
  const accountSummary = document.querySelector("#accountSummary");
  const profileButton = document.querySelector("#profileButton");
  const isLoggedIn = Boolean(account.user);
  const accountName = account.user?.name || account.user?.nickname || account.user?.username || account.user?.email || "";

  loginForm.hidden = isLoggedIn;
  signupLink.hidden = isLoggedIn;
  accountActions.hidden = !isLoggedIn;
  if (authTitle) authTitle.textContent = isLoggedIn ? "내 계정" : "로그인";
  if (accountSummary) {
    accountSummary.hidden = !isLoggedIn;
    accountSummary.innerHTML = isLoggedIn
      ? `<div class="account-avatar" aria-hidden="true">${accountName.slice(0, 1).toUpperCase()}</div><div><strong>${accountName}</strong><span>로그인됨</span></div>`
      : "";
  }
  if (profileButton) {
    profileButton.setAttribute("aria-label", isLoggedIn ? `${accountName} 계정 열기` : "로그인 열기");
    profileButton.classList.toggle("is-logged-in", isLoggedIn);
  }
  authStatus.textContent = statusMessage || (isLoggedIn
    ? `${account.user.username || account.user.email} 계정으로 로그인되어 있습니다. 변경 사항은 자동으로 서버에 저장됩니다.`
    : "로그인하면 이 기기의 데이터를 서버에 백업하고 다른 기기에서 이어서 사용할 수 있습니다.");
  authStatus.textContent = statusMessage || (isLoggedIn
    ? `${accountName} 계정으로 로그인되어 있습니다. 변경 사항은 자동으로 서버에 저장됩니다.`
    : "로그인하면 이 기기의 데이터를 서버에 백업하고 다른 기기에서 이어서 사용할 수 있습니다.");
}

function createUser(nickname) {
  return {
    id: `user-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    profile: normalizeProfile({ ...defaultProfile, nickname }),
    maxes: {},
    plan: null,
    history: [],
    completedDates: {},
    todayChecks: {},
  };
}

function activeUser() {
  return state.users.find((user) => user.id === state.activeUserId) || state.users[0];
}

function buildPlan(profile = {}, maxes = {}) {
  const days = number(profile.days) || 3;
  const recovery = profile.recovery || "normal";
  const intensity = profile.intensity || "normal";
  const sessionsPerWeek = strengthSessionsPerWeek(profile);
  const volume = trainingVolume(profile, sessionsPerWeek);
  const trainingDays = trainingDayOffsets(sessionsPerWeek);
  const available = Object.entries(maxes).filter(([, value]) => value > 0);
  const focus =
    profile.goal === "power"
      ? "스쿼트 · 데드리프트 · 프레스"
      : profile.goal === "mixed"
        ? "스쿼트 · 스내치 · 클린"
        : "스내치 · 클린 · 하체 힘";
  const weeks = buildWeeks(volume.bias);
  const weekSessions = weeks.map((week) => buildSessions(maxes, sessionsPerWeek, volume, week.week, profile.goal));

  return {
    title: `${focus} 중심 4주 계획`,
    summary: `${profile.nickname || "사용자"} · ${profile.height || "-"}cm, ${profile.weight || "-"}kg 기준. 운동 가능일, 회복 상태, 운동 강도에 맞춰 스트렝스 훈련일과 세트수를 조절합니다.`,
    metrics: [
      ["주 운동", `${days}일 중 ${sessionsPerWeek}회`],
      ["세트 기준", `${volume.baseSets}세트`],
      ["강도", strengthRange(profile.goal)],
      ["설정", intensity === "max" ? "매우 높게" : intensity === "hard" ? "높게" : intensity === "easy" ? "낮게" : "보통"],
    ],
    weeks,
    sessions: weekSessions[0] || [],
    weekSessions,
    trainingDays,
  };
}

function strengthSessionsPerWeek(profile = {}) {
  const days = Math.max(2, Math.min(6, number(profile.days) || 3));
  const recovery = profile.recovery || "normal";
  const intensity = profile.intensity || "normal";
  let sessions = days >= 6 ? 5 : days >= 5 ? 4 : days >= 4 ? 3 : 2;

  if (recovery === "low") sessions -= 1;
  if (intensity === "easy") sessions -= 1;
  if (recovery === "high" && (intensity === "hard" || intensity === "max")) sessions += 1;

  return Math.max(2, Math.min(days, Math.min(5, sessions)));
}

function strengthRange(goal) {
  if (goal === "power") return "75-95%";
  if (goal === "mixed") return "70-92%";
  return "60-90%";
}

function buildWeeks(volumeBias) {
  const setAdjust = volumeBias > 0 ? "세트 조금 추가" : volumeBias < 0 ? "세트 조금 줄임" : "기본 세트";
  return [
    { week: 1, name: "축적과 기술", range: "60-78%", note: `기술 반복과 기본 근력 볼륨을 쌓습니다. 모든 세트는 속도와 자세를 우선합니다. ${setAdjust}` },
    { week: 2, name: "강화와 풀", range: "70-85%", note: `반복 수를 줄이고 풀, 하이풀, 스쿼트 중량을 올립니다. ${setAdjust}` },
    { week: 3, name: "고강도 적응", range: "75-90%", note: "싱글과 더블 중심입니다. 바 속도가 꺾이거나 몸통 고정이 무너지면 그 리프트는 중단합니다." },
    { week: 4, name: "디로드와 속도", range: "60-72%", note: "피로를 낮추고 빠른 기술 세트로 다음 블록을 준비합니다." },
  ];
}

function trainingVolume(profile, sessionsPerWeek) {
  const days = number(profile.days) || sessionsPerWeek || 3;
  const recovery = profile.recovery || "normal";
  const intensity = profile.intensity || "normal";
  const frequencyBias = days <= 2 ? 2 : days <= 3 ? 1 : days >= 6 ? -1 : 0;
  const intensityBias = intensity === "max" ? 2 : intensity === "hard" ? 1 : intensity === "easy" ? -1 : 0;
  const recoveryBias = recovery === "high" ? 1 : recovery === "low" ? -1 : 0;
  const bias = Math.max(-2, Math.min(3, frequencyBias + intensityBias + recoveryBias));
  const baseSets = Math.max(4, Math.min(7, 5 + bias));

  return {
    bias,
    baseSets,
    reducedSets: Math.max(2, baseSets - 1),
  };
}

function trainingDayOffsets(sessionsPerWeek) {
  const patterns = {
    2: [0, 3],
    3: [0, 2, 4],
    4: [0, 1, 3, 5],
    5: [0, 1, 2, 4, 5],
  };
  return patterns[sessionsPerWeek] || patterns[3];
}

function buildSessions(maxes, sessionsPerWeek, volume, week = 1, goal = "olympic") {
  const baseSets = volume.baseSets;
  const reducedSets = volume.reducedSets;
  const templates = {
    olympic: olympicTemplates(maxes, baseSets, reducedSets),
    mixed: mixedTemplates(maxes, baseSets, reducedSets),
    power: powerTemplates(maxes, baseSets, reducedSets),
  };
  const sessions = templates[goal]?.[week] || templates.olympic[week] || templates.olympic[1];

  return expandSessions(sessions, sessionsPerWeek, week).map((session) => ({ ...session, lifts: session.lifts.filter(Boolean) }));
}

function expandSessions(sessions, sessionsPerWeek, week) {
  if (sessionsPerWeek <= sessions.length) return sessions.slice(0, sessionsPerWeek);
  const optional = {
    title: week === 4 ? "가벼운 힘 유지" : "힘 보강 + 등/코어",
    note: week === 4
      ? "디로드 주의 선택 세션입니다. 낮은 피로로 힘 전달과 복압을 확인합니다."
      : "고빈도 사용자를 위한 선택 세션입니다. 실패 반복 없이 등, 체간, 버티는 힘을 보강합니다.",
    lifts: [
      accessory("바벨 힘 전달", ["50-60% 스내치/클린 풀 5세트 x 2회", "바를 몸 가까이 붙이고 등 긴장 유지"]),
      accessory("등/체간 보강", ["백익스텐션 3세트 x 10-15회", "무거운 플랭크 또는 데드버그 3세트"]),
      accessory("하체 버티기", ["정지 스쿼트 3세트 x 3회", "바닥을 밀며 복압 유지"]),
    ],
  };
  return [...sessions, optional].slice(0, sessionsPerWeek);
}

function olympicTemplates(maxes, baseSets, reducedSets) {
  return {
    1: [
      {
        title: "스내치 기술 + 백스쿼트",
        note: "스내치를 낮은 피로로 반복하고 백스쿼트 볼륨으로 하체 기반을 만듭니다.",
        lifts: [
          prescription("snatch", maxes.snatch, [[60, 5, 2], [68, 4, 2]], "스내치"),
          prescription("backSquat", maxes.backSquat, [[72, baseSets, 3], [78, 3, 2]], "백스쿼트"),
          prescription("snatch", maxes.snatch, [[82, reducedSets, 3]], "스내치 풀"),
          accessory("오버헤드 지지 힘", ["오버헤드 스쿼트 3세트 x 3회", "팔꿈치 잠금과 복압 유지"]),
        ],
      },
      {
        title: "클린 & 저크 + 프론트스쿼트",
        note: "프론트랙에서 버티는 힘과 저크 지지를 함께 훈련합니다.",
        lifts: [
          prescription("cleanJerk", maxes.cleanJerk, [[60, 5, 1], [70, 4, 1]], "클린 & 저크"),
          prescription("frontSquat", maxes.frontSquat, [[72, baseSets, 3], [78, 3, 2]], "프론트스쿼트"),
          prescription("pushPress", maxes.pushPress, [[70, 4, 3]], "푸시프레스"),
          accessory("저크 지지", ["랙 딥/드라이브 3세트 x 3회", "저크 락아웃 홀드 3세트 x 8초"]),
        ],
      },
      {
        title: "풀 + 하체 보강",
        note: "논문 사례처럼 풀과 스쿼트를 묶어 당기는 힘과 버티는 힘을 같이 올립니다.",
        lifts: [
          prescription("deadlift", maxes.deadlift, [[72, baseSets, 3], [80, 2, 2]], "데드리프트"),
          prescription("cleanJerk", maxes.cleanJerk, [[85, reducedSets, 3]], "클린 풀"),
          prescription("backSquat", maxes.backSquat, [[68, 4, 4]], "템포 백스쿼트"),
          accessory("등/코어", ["백익스텐션 3세트 x 12회", "사이드 플랭크 3세트"]),
        ],
      },
      {
        title: "저크 지지 + 코어",
        note: "머리 위 지지와 체간 안정성을 낮은 피로로 보강합니다.",
        lifts: [
          prescription("pushPress", maxes.pushPress, [[65, 5, 3], [72, 3, 2]], "푸시프레스"),
          prescription("frontSquat", maxes.frontSquat, [[68, 4, 3]], "프론트스쿼트"),
          prescription("snatch", maxes.snatch, [[62, 5, 1]], "파워 스내치"),
          accessory("어깨 안정화", ["스캐풀라 풀업 3세트", "밴드 풀어파트 3세트 x 15회"]),
        ],
      },
    ],
    2: [
      {
        title: "스내치 강화 + 스쿼트",
        note: "기술 성공률을 지키며 중량을 올립니다.",
        lifts: [
          prescription("snatch", maxes.snatch, [[70, 4, 2], [76, 3, 1], [80, 2, 1]], "스내치"),
          prescription("backSquat", maxes.backSquat, [[76, baseSets, 2], [82, 3, 2], [85, 2, 1]], "백스쿼트"),
          prescription("snatch", maxes.snatch, [[90, reducedSets, 2]], "스내치 풀"),
          accessory("기술 제한", ["실패가 나오면 즉시 5-8% 감량", "성공률 80% 이상 유지"]),
        ],
      },
      {
        title: "클린 힘 + 저크",
        note: "클린 받는 힘과 머리 위 지지력을 강화합니다.",
        lifts: [
          prescription("cleanJerk", maxes.cleanJerk, [[70, 4, 1], [78, 3, 1], [82, 2, 1]], "클린 & 저크"),
          prescription("frontSquat", maxes.frontSquat, [[76, 4, 2], [83, 3, 1]], "프론트스쿼트"),
          prescription("pushPress", maxes.pushPress, [[74, 4, 2], [80, 2, 2]], "푸시프레스"),
          accessory("프론트랙 지지", ["프론트랙 홀드 3세트 x 10초", "무거운 랙 서포트 3세트 x 8초"]),
        ],
      },
      {
        title: "풀 집중 + 하체",
        note: "80-90%대 풀을 넣어 당기는 힘을 중점적으로 올립니다.",
        lifts: [
          prescription("cleanJerk", maxes.cleanJerk, [[90, reducedSets, 2], [95, 2, 2]], "클린 풀"),
          prescription("backSquat", maxes.backSquat, [[74, 4, 3]], "정지 백스쿼트"),
          prescription("deadlift", maxes.deadlift, [[82, 3, 2]], "데드리프트"),
          accessory("후면사슬", ["루마니안 데드리프트 또는 힙힌지 3세트 x 8회"]),
        ],
      },
      {
        title: "속도 리프트",
        note: "볼륨을 낮게 유지하고 바벨을 빠르게 밀어내는 힘 전달을 연습합니다.",
        lifts: [
          prescription("snatch", maxes.snatch, [[65, 6, 1]], "스내치 싱글"),
          prescription("cleanJerk", maxes.cleanJerk, [[68, 5, 1]], "클린 & 저크 싱글"),
          prescription("frontSquat", maxes.frontSquat, [[72, 3, 2]], "프론트스쿼트"),
        ],
      },
    ],
    3: [
      {
        title: "스내치 피크 + 백스쿼트",
        note: "무거운 싱글은 성공률이 높은 무게까지만 진행합니다.",
        lifts: [
          prescription("snatch", maxes.snatch, [[74, 3, 1], [80, 2, 1], [84, 1, 1]], "스내치"),
          prescription("backSquat", maxes.backSquat, [[80, 3, 2], [86, 2, 1], [88, 1, 1]], "백스쿼트"),
          prescription("deadlift", maxes.deadlift, [[84, 3, 1]], "데드리프트"),
          accessory("피크 규칙", ["바 속도 저하 또는 몸통 고정 붕괴 시 종료", "추가 실패 시도 금지"]),
        ],
      },
      {
        title: "클린 피크 + 프론트스쿼트",
        note: "클린을 안정적으로 받고 프론트랙 버티는 힘을 확인합니다.",
        lifts: [
          prescription("cleanJerk", maxes.cleanJerk, [[76, 3, 1], [82, 2, 1], [86, 1, 1]], "클린 & 저크"),
          prescription("frontSquat", maxes.frontSquat, [[80, 3, 2], [86, 2, 1], [90, 1, 1]], "프론트스쿼트"),
          prescription("pushPress", maxes.pushPress, [[78, 3, 2], [84, 2, 1]], "푸시프레스"),
          accessory("회복 제한", ["고강도 싱글 후 보조운동은 RPE 7 이하"]),
        ],
      },
      {
        title: "고중량 풀 + 코어 힘",
        note: "풀은 무겁지만 리프트 실패를 만들지 않는 보조 중량으로 씁니다.",
        lifts: [
          prescription("cleanJerk", maxes.cleanJerk, [[95, 3, 2], [100, 2, 1]], "클린 풀"),
          prescription("deadlift", maxes.deadlift, [[86, 2, 1]], "데드리프트"),
          prescription("backSquat", maxes.backSquat, [[76, 3, 3]], "백스쿼트"),
          accessory("코어 힘", ["무거운 캐리 또는 플랭크 3세트"]),
        ],
      },
      {
        title: "가벼운 기술 확인",
        note: "피크 주의 보조일입니다. 낮은 피로로 복압과 바벨 고정력을 확인합니다.",
        lifts: [
          prescription("snatch", maxes.snatch, [[68, 5, 1]], "스내치"),
          prescription("cleanJerk", maxes.cleanJerk, [[70, 4, 1]], "클린 & 저크"),
          prescription("pushPress", maxes.pushPress, [[72, 3, 2]], "푸시프레스"),
        ],
      },
    ],
    4: [
      {
        title: "빠른 스내치 + 스쿼트",
        note: "무게를 낮추고 빠르고 깔끔하게 움직입니다.",
        lifts: [
          prescription("snatch", maxes.snatch, [[60, 5, 1], [68, 3, 1]], "스내치"),
          prescription("backSquat", maxes.backSquat, [[65, 4, 2], [72, 3, 2]], "백스쿼트"),
          prescription("deadlift", maxes.deadlift, [[70, 3, 2]], "데드리프트"),
          accessory("가벼운 하체 힘", ["정지 백스쿼트 2세트 x 3회", "복압과 발바닥 압력 유지"]),
        ],
      },
      {
        title: "가벼운 클린 + 프레스",
        note: "회복을 해치지 않으면서 기술과 속도를 유지합니다.",
        lifts: [
          prescription("frontSquat", maxes.frontSquat, [[65, 4, 2], [72, 3, 2]], "프론트스쿼트"),
          prescription("cleanJerk", maxes.cleanJerk, [[62, 5, 1], [70, 3, 1]], "클린 & 저크"),
          prescription("pushPress", maxes.pushPress, [[65, 4, 2]], "푸시프레스"),
          accessory("상체 지지 힘", ["프론트랙 홀드 3세트 x 8초", "오버헤드 서포트 3세트 x 8초"]),
        ],
      },
      {
        title: "하체와 풀 정리",
        note: "다음 계획으로 넘어가기 전 피로를 남기지 않습니다.",
        lifts: [
          prescription("deadlift", maxes.deadlift, [[70, 3, 2]], "데드리프트"),
          prescription("backSquat", maxes.backSquat, [[65, 3, 3]], "가벼운 백스쿼트"),
          prescription("snatch", maxes.snatch, [[65, 4, 1]], "스내치 싱글"),
        ],
      },
      {
        title: "기술 리허설",
        note: "낮은 강도로 성공적인 반복만 쌓습니다.",
        lifts: [
          prescription("snatch", maxes.snatch, [[60, 4, 1]], "스내치"),
          prescription("cleanJerk", maxes.cleanJerk, [[62, 4, 1]], "클린 & 저크"),
          prescription("frontSquat", maxes.frontSquat, [[65, 3, 2]], "프론트스쿼트"),
        ],
      },
    ],
  };
}

function mixedTemplates(maxes, baseSets, reducedSets) {
  const templates = olympicTemplates(maxes, baseSets, reducedSets);
  templates[1][2] = {
    title: "데드리프트 + 스내치 보강",
    note: "파워리프팅식 당기는 힘과 역도 기술을 같은 주에 가져갑니다.",
    lifts: [
      prescription("deadlift", maxes.deadlift, [[74, baseSets, 3], [80, 2, 2]], "데드리프트"),
      prescription("snatch", maxes.snatch, [[65, 5, 1]], "스내치 싱글"),
      prescription("backSquat", maxes.backSquat, [[70, 4, 4]], "백스쿼트"),
    ],
  };
  templates[2][2] = {
    title: "중량 데드리프트 + 풀",
    note: "데드리프트를 메인으로 두고 클린 풀을 보조로 씁니다.",
    lifts: [
      prescription("deadlift", maxes.deadlift, [[78, 4, 2], [84, 3, 1]], "데드리프트"),
      prescription("cleanJerk", maxes.cleanJerk, [[90, reducedSets, 2]], "클린 풀"),
      prescription("pushPress", maxes.pushPress, [[74, 4, 2]], "푸시프레스"),
    ],
  };
  templates[3][2] = {
    title: "데드리프트 피크 + 스쿼트",
    note: "고강도 당기기 후 스쿼트는 기술 유지용으로 줄입니다.",
    lifts: [
      prescription("deadlift", maxes.deadlift, [[82, 3, 1], [88, 2, 1], [90, 1, 1]], "데드리프트"),
      prescription("backSquat", maxes.backSquat, [[76, 3, 3]], "백스쿼트"),
      prescription("snatch", maxes.snatch, [[70, 4, 1]], "스내치"),
    ],
  };
  return templates;
}

function powerTemplates(maxes, baseSets, reducedSets) {
  return {
    1: [
      {
        title: "백스쿼트 볼륨",
        note: "자세 실패가 적은 리프트로 힘 기반을 만듭니다.",
        lifts: [
          prescription("backSquat", maxes.backSquat, [[75, baseSets, 5], [82, 3, 3]], "백스쿼트"),
          prescription("deadlift", maxes.deadlift, [[75, 4, 3]], "데드리프트"),
          prescription("pushPress", maxes.pushPress, [[70, 4, 4]], "푸시프레스"),
        ],
      },
      {
        title: "프론트스쿼트 + 프레스",
        note: "상체 지지와 하체 자세를 보강합니다.",
        lifts: [
          prescription("frontSquat", maxes.frontSquat, [[75, baseSets, 4], [82, 3, 3]], "프론트스쿼트"),
          prescription("pushPress", maxes.pushPress, [[75, 4, 3]], "푸시프레스"),
          prescription("cleanJerk", maxes.cleanJerk, [[72, 4, 2]], "랙 풀"),
        ],
      },
      {
        title: "데드리프트 볼륨",
        note: "당기는 힘을 메인으로 두고 스쿼트는 가볍게 반복합니다.",
        lifts: [
          prescription("deadlift", maxes.deadlift, [[78, baseSets, 3], [85, 3, 2]], "데드리프트"),
          prescription("backSquat", maxes.backSquat, [[72, 4, 4]], "가벼운 백스쿼트"),
          prescription("snatch", maxes.snatch, [[70, 5, 3]], "하이풀"),
        ],
      },
      {
        title: "속도 힘 보조",
        note: "낮은 강도에서 빠르게 밀고 당기며 힘 전달을 유지합니다.",
        lifts: [
          prescription("pushPress", maxes.pushPress, [[68, 6, 3]], "스피드 푸시프레스"),
          prescription("frontSquat", maxes.frontSquat, [[70, 3, 3]], "프론트스쿼트"),
          prescription("cleanJerk", maxes.cleanJerk, [[68, 4, 2]], "랙 드라이브"),
        ],
      },
    ],
    2: [
      {
        title: "스쿼트 강화",
        note: "반복 수를 줄이고 주 리프트 중량을 올립니다.",
        lifts: [
          prescription("backSquat", maxes.backSquat, [[80, baseSets, 3], [86, 3, 2], [88, 2, 1]], "백스쿼트"),
          prescription("frontSquat", maxes.frontSquat, [[78, 3, 2]], "프론트스쿼트"),
          prescription("pushPress", maxes.pushPress, [[76, 4, 2]], "푸시프레스"),
        ],
      },
      {
        title: "데드리프트 강화",
        note: "무거운 더블 중심으로 당기는 힘을 올립니다.",
        lifts: [
          prescription("deadlift", maxes.deadlift, [[82, 4, 2], [88, 3, 1]], "데드리프트"),
          prescription("cleanJerk", maxes.cleanJerk, [[92, reducedSets, 2]], "중량 풀"),
          prescription("backSquat", maxes.backSquat, [[76, 3, 3]], "정지 백스쿼트"),
        ],
      },
      {
        title: "프레스 + 하체",
        note: "푸시프레스를 강하게 가져가고 하체 볼륨은 낮춥니다.",
        lifts: [
          prescription("pushPress", maxes.pushPress, [[80, 4, 2], [86, 2, 1]], "푸시프레스"),
          prescription("frontSquat", maxes.frontSquat, [[80, 3, 2]], "프론트스쿼트"),
          prescription("snatch", maxes.snatch, [[72, 4, 3]], "하이풀"),
        ],
      },
      {
        title: "속도 스쿼트",
        note: "무거운 주 리프트 사이에서 빠른 움직임을 유지합니다.",
        lifts: [
          prescription("backSquat", maxes.backSquat, [[70, 6, 2]], "스피드 백스쿼트"),
          prescription("deadlift", maxes.deadlift, [[75, 3, 2]], "스피드 데드리프트"),
          prescription("pushPress", maxes.pushPress, [[72, 3, 3]], "푸시프레스"),
        ],
      },
    ],
    3: [
      {
        title: "백스쿼트 피크",
        note: "가장 무거운 스쿼트 주입니다. 좋은 자세의 싱글만 허용합니다.",
        lifts: [
          prescription("backSquat", maxes.backSquat, [[85, 3, 2], [90, 2, 1], [93, 1, 1]], "백스쿼트"),
          prescription("frontSquat", maxes.frontSquat, [[85, 2, 2]], "프론트스쿼트"),
          prescription("pushPress", maxes.pushPress, [[82, 3, 2]], "푸시프레스"),
        ],
      },
      {
        title: "데드리프트 피크",
        note: "허리 자세가 무너지기 전까지만 진행합니다.",
        lifts: [
          prescription("deadlift", maxes.deadlift, [[85, 3, 1], [90, 2, 1], [93, 1, 1]], "데드리프트"),
          prescription("backSquat", maxes.backSquat, [[78, 3, 3]], "가벼운 백스쿼트"),
          prescription("cleanJerk", maxes.cleanJerk, [[95, 3, 2]], "중량 풀"),
        ],
      },
      {
        title: "프레스 피크",
        note: "상체 출력과 머리 위 지지력을 확인합니다.",
        lifts: [
          prescription("pushPress", maxes.pushPress, [[84, 3, 2], [90, 2, 1]], "푸시프레스"),
          prescription("frontSquat", maxes.frontSquat, [[86, 2, 1]], "프론트스쿼트"),
          prescription("snatch", maxes.snatch, [[75, 4, 2]], "오버헤드 서포트"),
        ],
      },
      {
        title: "힘 유지",
        note: "고강도 주의 피로를 누적하지 않는 보조일입니다.",
        lifts: [
          prescription("backSquat", maxes.backSquat, [[68, 3, 3]], "백스쿼트"),
          prescription("cleanJerk", maxes.cleanJerk, [[65, 4, 2]], "중량 풀"),
          prescription("pushPress", maxes.pushPress, [[70, 3, 2]], "푸시프레스"),
        ],
      },
    ],
    4: [
      {
        title: "스쿼트 디로드",
        note: "피로를 낮추고 다음 블록을 준비합니다.",
        lifts: [
          prescription("backSquat", maxes.backSquat, [[60, 4, 3], [68, 3, 2]], "백스쿼트"),
          prescription("frontSquat", maxes.frontSquat, [[62, 3, 2]], "프론트스쿼트"),
          prescription("pushPress", maxes.pushPress, [[60, 4, 3]], "푸시프레스"),
        ],
      },
      {
        title: "데드리프트 디로드",
        note: "당기는 패턴은 유지하되 무게는 낮춥니다.",
        lifts: [
          prescription("deadlift", maxes.deadlift, [[62, 4, 2], [70, 3, 2]], "데드리프트"),
          prescription("backSquat", maxes.backSquat, [[62, 3, 3]], "가벼운 백스쿼트"),
          prescription("cleanJerk", maxes.cleanJerk, [[60, 4, 2]], "랙 풀"),
        ],
      },
      {
        title: "프레스 디로드",
        note: "가볍게 빠르게 밀어냅니다.",
        lifts: [
          prescription("pushPress", maxes.pushPress, [[62, 4, 2], [68, 3, 2]], "푸시프레스"),
          prescription("frontSquat", maxes.frontSquat, [[65, 3, 2]], "프론트스쿼트"),
          prescription("snatch", maxes.snatch, [[60, 4, 2]], "하이풀"),
        ],
      },
      {
        title: "회복 세션",
        note: "모든 반복을 여유 있게 끝냅니다.",
        lifts: [
          prescription("backSquat", maxes.backSquat, [[60, 3, 3]], "백스쿼트"),
          prescription("deadlift", maxes.deadlift, [[60, 3, 2]], "데드리프트"),
          prescription("pushPress", maxes.pushPress, [[60, 3, 3]], "푸시프레스"),
        ],
      },
    ],
  };
}

function prescription(key, max, waves, label = lifts[key]) {
  if (!max) return null;
  return {
    name: label,
    max,
    trainingMax: roundLoad(max * 0.9),
    cue: strengthCue(key, label),
    style: setStyle(waves),
    sets: waves.map(([percent, sets, reps]) => ({
      percent,
      sets,
      reps,
      weight: roundLoad(max * (percent / 100)),
    })),
  };
}

function strengthCue(key, label = "") {
  if (/하이풀|랙 풀|풀/.test(label)) return "등과 광배를 먼저 잠그고 바를 몸 가까이 붙여 당기는 힘을 끝까지 유지합니다.";
  if (/홀드|서포트|지지/.test(label)) return "복압을 유지하고 관절을 잠근 상태로 무게를 흔들림 없이 버팁니다.";
  if (key === "backSquat" || /백스쿼트|스쿼트/.test(label)) return "복압을 잠그고 무릎과 엉덩이를 같이 밀어 중간 지점에서 힘이 새지 않게 버팁니다.";
  if (key === "frontSquat" || /프론트/.test(label)) return "팔꿈치를 높게 고정하고 몸통을 세워 바벨이 앞쪽으로 쏟아지지 않게 받칩니다.";
  if (key === "deadlift" || /데드리프트/.test(label)) return "광배를 조이고 바를 몸에 붙여 바닥에서부터 등과 엉덩이를 같이 밀어냅니다.";
  if (key === "pushPress" || /프레스|저크/.test(label)) return "딥은 짧게, 몸통은 수직으로 세우고 다리 힘을 바벨에 바로 전달합니다.";
  if (key === "snatch" || /스내치/.test(label)) return "등을 단단히 잠근 상태로 바를 몸 가까이 끌고, 당기는 힘이 끊기기 전까지 밀어냅니다.";
  if (key === "cleanJerk" || /클린/.test(label)) return "바를 몸 가까이 붙이고 프론트랙에서 복압과 등 힘으로 무게를 버팁니다.";
  return "복압, 등 긴장, 발바닥 압력을 유지해서 반복마다 힘 전달이 흔들리지 않게 합니다.";
}

function setStyle(waves) {
  const percents = waves.map(([percent]) => percent);
  const maxPercent = Math.max(...percents);
  const minPercent = Math.min(...percents);
  if (maxPercent >= 88) return "피크 싱글";
  if (maxPercent - minPercent >= 10) return "빌드업";
  if (waves.length > 1) return "웨이브";
  if (maxPercent <= 68) return "스피드";
  return "볼륨";
}

function setTag(index, total, percent) {
  if (total === 1) return percent >= 80 ? "중량 세트" : "작업 세트";
  if (index === 0) return "준비";
  if (index === total - 1) return percent >= 82 ? "탑세트" : "백오프";
  return percent >= 78 ? "상승" : "작업";
}

function accessory(name, items) {
  return {
    name,
    accessory: true,
    sets: items.map((text) => ({ text })),
  };
}

function renderAll() {
  renderUsers();
  renderPlan();
  renderNutrition();
  renderTodaySession();
  renderHistory();
  renderCalendar();
  renderCalendarNavState();
}

function renderUsers() {
  const userCardList = document.querySelector("#userCardList");
  if (!userCardList) return;
  const current = activeUser();
  userCardList.innerHTML = state.users
    .map((user) => {
      const profile = user.profile;
      const isActive = user.id === current.id;
      return `<article class="user-card ${isActive ? "is-active" : ""}">
        <button class="user-card-main" type="button" data-user-id="${user.id}">
          <strong>${profile.nickname}</strong>
          <span>${profile.weight}kg · 주 ${profile.days}회</span>
        </button>
        <button class="user-delete-button" type="button" data-delete-user-id="${user.id}" aria-label="${profile.nickname} 사용자 삭제">삭제</button>
      </article>`;
    })
    .join("");
}

function deleteUser(userId) {
  if (state.users.length <= 1) {
    showToast("사용자는 최소 1명 필요합니다.");
    return;
  }

  const target = state.users.find((user) => user.id === userId);
  if (!target) return;

  const ok = window.confirm(`${target.profile.nickname} 사용자를 삭제할까요? 프로필, 1RM, 완료 기록이 함께 삭제됩니다.`);
  if (!ok) return;

  state.users = state.users.filter((user) => user.id !== userId);
  if (state.activeUserId === userId) state.activeUserId = state.users[0].id;
  selectedCalendarDate = isoDate(new Date());
  saveState(`${target.profile.nickname} 사용자를 삭제했습니다.`);
  hydrateForms();
  renderAll();
  showDrawerView("users");
}

function renderNutrition() {
  const profile = activeUser().profile;
  const bodyWeightKg = number(profile.weight);
  const days = number(profile.days) || 3;
  const activityFactor = days >= 6 ? 34 : days >= 4 ? 32 : 30;
  const genderAdjust = profile.gender === "male" ? 100 : profile.gender === "female" ? -100 : 0;
  const calorieTarget = roundToNearest(bodyWeightKg * activityFactor + genderAdjust, 50);
  const protein = Math.round(bodyWeightKg * 1.6);
  const carbs = Math.round(bodyWeightKg * (days >= 5 ? 4 : 3.2));
  const fat = Math.round(bodyWeightKg * 0.7);
  const genderText = profile.gender === "male" ? "남성" : profile.gender === "female" ? "여성" : "성별 미지정";

  document.querySelector("#nutritionCard").innerHTML = `<div class="nutrition-head">
    <div>
      <h2>오늘 섭취 목표</h2>
      <p>${genderText}, 체중, 주 운동 횟수 기준의 일반 회복 가이드입니다.</p>
    </div>
    <span class="badge">${calorieTarget} kcal</span>
  </div>
  <div class="nutrition-grid">
    <div><strong>${protein}g</strong><span>단백질</span></div>
    <div><strong>${carbs}g</strong><span>탄수화물</span></div>
    <div><strong>${fat}g</strong><span>지방</span></div>
  </div>
  <p class="nutrition-note">기준: 체중 1kg당 단백질 1.6g, 지방 0.7g, 탄수화물 3.2-4g. 칼로리는 체중 x ${activityFactor}kcal에 성별 보정을 반영했습니다.</p>`;
}

function renderPlan() {
  const user = activeUser();
  const plan = user.plan;
  document.querySelector("#planTitle").textContent = plan?.title || "계획이 아직 없습니다.";
  document.querySelector("#planSummary").textContent = plan?.summary || "마이페이지에서 프로필을 저장하고 1RM을 입력해 주세요.";
  document.querySelector("#metricRow").innerHTML = (plan?.metrics || [])
    .map(([label, value]) => `<span><small>${label}</small><strong>${value}</strong></span>`)
    .join("");

  const currentWeek = plan?.weeks?.[selectedPlanWeek - 1];
  document.querySelector("#weekList").innerHTML = currentWeek
    ? `<article class="exercise-card week-compact">
        <header><div><h3>${selectedPlanWeek}주차: ${currentWeek.name}</h3><p>${currentWeek.note}</p></div><span class="badge">${currentWeek.range}</span></header>
      </article>`
    : "";

  const weekSelect = document.querySelector("#weekSelect");
  if (weekSelect) {
    weekSelect.innerHTML = [1, 2, 3, 4]
      .map((week) => `<option value="${week}" ${week === selectedPlanWeek ? "selected" : ""}>${week}주차</option>`)
      .join("");
  }

  const legacyWeekTabs = document.querySelector("#weekTabs");
  if (legacyWeekTabs) {
    legacyWeekTabs.innerHTML = [1, 2, 3, 4]
      .map((week) => `<button class="${week === selectedPlanWeek ? "is-active" : ""}" type="button" data-week="${week}">${week}주</button>`)
      .join("");
  }

  const trainingDays = plan?.trainingDays || trainingDayOffsets(plan?.sessions?.length || 3);
  document.querySelector("#dateTabs").innerHTML = [0, 1, 2, 3, 4, 5, 6]
    .map((offset) => {
      const date = addDays(new Date(), (selectedPlanWeek - 1) * 7 + offset);
      const label = planDayLabel(date, offset, selectedPlanWeek);
      const isTrainingDay = trainingDays.includes(offset);
      const classes = [offset === selectedPlanDayOffset ? "is-active" : "", isTrainingDay ? "is-training" : "is-rest"].filter(Boolean).join(" ");
      return `<button class="${classes}" type="button" data-offset="${offset}">
        <strong>${label}</strong><span>${date.getDate()}</span><em>${isTrainingDay ? "훈련" : "회복"}</em>
      </button>`;
    })
    .join("");

  const selectedSession = pickPlanSession(plan, selectedPlanWeek, selectedPlanDayOffset);
  document.querySelector("#programList").innerHTML = selectedSession
    ? renderSessionCard(selectedSession, selectedPlanWeek, selectedPlanDayOffset)
    : `<div class="empty-state">1RM을 입력하면 4주 블록과 오늘 세션이 생성됩니다.</div>`;
  if (!selectedSession) {
    document.querySelector("#programList").innerHTML = plan
      ? `<div class="empty-state">오늘은 스트렝스 훈련을 배치하지 않은 회복일입니다. 마이페이지의 주 운동 횟수, 회복 상태, 운동 강도를 바꾸면 훈련일 배치가 달라집니다.</div>`
      : `<div class="empty-state">1RM을 입력하면 4주 블록과 훈련일이 생성됩니다.</div>`;
  }
}

function renderSessionCard(session, week = selectedPlanWeek, dayOffset = selectedPlanDayOffset) {
  const date = addDays(new Date(), (week - 1) * 7 + dayOffset);
  return `<article class="exercise-card">
    <header><div><h3>${session.title}</h3><p>${week}주차 · ${date.getMonth() + 1}/${date.getDate()} · ${session.note}</p></div><span class="badge">${session.lifts.length} lifts</span></header>
    <div class="sets">${session.lifts.map(renderLiftSummary).join("") || `<p>입력된 1RM이 없어 처방을 만들 수 없습니다.</p>`}</div>
  </article>`;
}

function pickPlanSession(plan, week, offset) {
  const sessions = plan?.weekSessions?.[week - 1] || plan?.sessions || [];
  if (!sessions.length) return null;
  const trainingDays = plan?.trainingDays || trainingDayOffsets(sessions.length);
  const sessionIndex = trainingDays.indexOf(offset);
  if (sessionIndex === -1) return null;
  return sessions[sessionIndex % sessions.length];
}

function planDayLabel(date, offset, week = 1) {
  if (week === 1 && offset === 0) return "오늘";
  if (week === 1 && offset === 1) return "내일";
  return ["일", "월", "화", "수", "목", "금", "토"][date.getDay()];
}

function renderLiftSummary(lift) {
  if (lift.accessory) {
    const sets = lift.sets.map((set) => set.text).join(" / ");
    return `<div class="set-row"><strong>${lift.name}</strong><span>${sets}</span><span>보강</span></div>`;
  }

  const unitLabel = unit(activeUser().profile);
  const sets = lift.sets.map((set, index) => `${setTag(index, lift.sets.length, set.percent)} ${set.percent}% ${set.sets}x${set.reps} @ ${set.weight}${unitLabel}`).join(" / ");
  return `<div class="set-row"><strong>${lift.name}</strong><span>${sets}<small>${lift.cue || ""}</small></span><span>${lift.style || "힘"} · TM ${lift.trainingMax}${unitLabel}</span></div>`;
}

function renderTodaySession() {
  const user = activeUser();
  const session = user.plan?.sessions?.[0];
  const isDone = Boolean(user.completedDates?.[isoDate(new Date())]);
  const counts = todaySetCounts(session);
  const allChecked = counts.total > 0 && counts.done === counts.total;
  document.querySelector("#todayHint").textContent = session?.note || "프로필과 1RM을 입력하면 오늘 진행할 세션이 생성됩니다.";
  document.querySelector("#todaySession").innerHTML = session
    ? session.lifts.map(renderTodayLift).join("")
    : `<div class="empty-state">아직 생성된 세션이 없습니다. 1RM 화면에서 현재 최고 중량을 입력해 주세요.</div>`;
  const completeButton = document.querySelector("#completeSession");
  completeButton.textContent = session ? (isDone ? "오늘 완료됨" : "오늘 스트렝스 완료") : "1RM 입력하기";
  completeButton.classList.toggle("is-complete", isDone);
  completeButton.disabled = Boolean(session) && (!allChecked || isDone);
  completeButton.title = Boolean(session) && !allChecked ? "위 세트를 모두 체크하면 완료할 수 있습니다." : "";
  document.querySelector("#undoCompleteSession").hidden = !isDone;
}

function renderTodayLift(lift) {
  const todayChecks = activeUser().todayChecks?.[isoDate(new Date())] || {};
  if (lift.accessory) {
    return `<section class="today-lift">
      <header><div><h3>${lift.name}</h3><p>스트렝스 보조운동: 등, 체간, 버티는 힘을 보강합니다.</p></div><span class="badge">보강</span></header>
      <div class="sets">${lift.sets
        .map((set, index) => {
          const checkId = `${lift.name}-${index}`;
          const checked = Boolean(todayChecks[checkId]);
          return `<label class="set-row today-set ${checked ? "is-checked" : ""}">
            <strong>${index + 1}</strong>
            <span>${set.text}</span>
            <input type="checkbox" data-check-id="${checkId}" aria-label="${lift.name} ${index + 1}번 보강 완료" ${checked ? "checked" : ""} />
          </label>`;
        })
        .join("")}</div>
    </section>`;
  }

  return `<section class="today-lift">
    <header><div><h3>${lift.name}</h3><p>현재 1RM ${lift.max}${unit(activeUser().profile)}, 트레이닝 맥스 ${lift.trainingMax}${unit(activeUser().profile)} · ${lift.cue || ""}</p></div><span class="badge">${lift.style || "1RM"}</span></header>
    <div class="sets">${lift.sets
      .map((set, index) => {
        const checkId = `${lift.name}-${index}`;
        const checked = Boolean(todayChecks[checkId]);
        return `<label class="set-row today-set ${checked ? "is-checked" : ""}">
          <strong>${set.percent}%</strong>
          <span>${setTag(index, lift.sets.length, set.percent)} · ${set.sets}세트 x ${set.reps}회 · ${set.weight}${unit(activeUser().profile)}</span>
          <input type="checkbox" data-check-id="${checkId}" aria-label="${lift.name} ${index + 1}번 처방 완료" ${checked ? "checked" : ""} />
        </label>`;
      })
      .join("")}</div>
  </section>`;
}

function todaySetCounts(session = activeUser().plan?.sessions?.[0]) {
  const todayChecks = activeUser().todayChecks?.[isoDate(new Date())] || {};
  const ids = (session?.lifts || []).flatMap((lift) => lift.sets.map((_, index) => `${lift.name}-${index}`));
  return {
    total: ids.length,
    done: ids.filter((id) => todayChecks[id]).length,
  };
}

function undoCompletion(date) {
  const user = activeUser();
  delete user.completedDates[date];
  user.todayChecks = user.todayChecks || {};
  delete user.todayChecks[date];
  user.history = (user.history || []).filter((item) => item.isoDate !== date);
  selectedCalendarDate = date;
  saveState("완료를 취소했습니다.");
  renderAll();
}

function renderHistory() {
  const history = activeUser().history || [];
  document.querySelector("#historyList").innerHTML = history.length
    ? history.map((item) => `<div class="set-row"><strong>${item.date}</strong><span>${item.title}</span><span>${item.doneSets}/${item.totalSets}</span></div>`).join("")
    : `<div class="empty-state">아직 완료한 세션이 없습니다.</div>`;
}

function renderCalendar() {
  const user = activeUser();
  const year = calendarCursor.getFullYear();
  const month = calendarCursor.getMonth();
  const first = new Date(year, month, 1);
  const last = new Date(year, month + 1, 0);
  const cells = [];
  document.querySelector("#calendarTitle").textContent = `${year}.${String(month + 1).padStart(2, "0")}`;

  for (let i = 0; i < first.getDay(); i += 1) cells.push(`<span class="calendar-cell is-empty"></span>`);
  for (let day = 1; day <= last.getDate(); day += 1) {
    const key = isoDate(new Date(year, month, day));
    const classes = ["calendar-cell"];
    if (key === isoDate(new Date())) classes.push("is-today");
    if (user.completedDates?.[key]) classes.push("is-done");
    if (key === selectedCalendarDate) classes.push("is-selected");
    cells.push(`<button class="${classes.join(" ")}" type="button" data-date="${key}"><b>${day}</b><em>${user.completedDates?.[key] ? "✓" : ""}</em></button>`);
  }
  document.querySelector("#calendarGrid").innerHTML = cells.join("");
  renderCalendarDetail();
}

function renderCalendarDetail() {
  const user = activeUser();
  const item = (user.history || []).find((entry) => entry.isoDate === selectedCalendarDate);
  const detail = document.querySelector("#calendarDetail");
  if (!item) {
    detail.innerHTML = `<div class="empty-state">${formatKoreanDate(selectedCalendarDate)} 완료 기록이 없습니다.</div>`;
    return;
  }
  detail.innerHTML = `<article class="exercise-card calendar-summary">
    <header><div><h3>${formatKoreanDate(selectedCalendarDate)}</h3><p>${item.title} · ${item.doneSets}/${item.totalSets} 세트 완료</p></div><span class="badge">완료</span></header>
    <div class="sets">${(item.lifts || []).map((lift) => `<div class="set-row"><strong>${lift.name}</strong><span>${lift.summary}</span><span>✓</span></div>`).join("") || `<div class="set-row"><strong>기록</strong><span>${item.title}</span><span>✓</span></div>`}</div>
    <button class="calendar-undo" type="button" data-undo-date="${selectedCalendarDate}">완료 취소</button>
  </article>`;
}

function renderCalendarNavState() {
  document.querySelector("#calendarNavIcon")?.classList.toggle("has-check", Boolean(activeUser().completedDates?.[isoDate(new Date())]));
}

function showStep(step) {
  Object.entries(panels).forEach(([key, panel]) => panel?.classList.toggle("is-active", key === step));
  document.querySelectorAll(".appbar-item").forEach((tab) => tab.classList.toggle("is-active", tab.dataset.step === step));
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function openProfile() {
  document.querySelector("#profileDrawer")?.classList.add("is-open");
  document.querySelector("#profileDrawer")?.setAttribute("aria-hidden", "false");
  showDrawerView("auth");
}

function closeProfile() {
  document.querySelector("#profileDrawer")?.classList.remove("is-open");
  document.querySelector("#profileDrawer")?.setAttribute("aria-hidden", "true");
}

function showDrawerView(view) {
  document.querySelectorAll("[data-drawer-view-panel]").forEach((panel) => {
    panel.classList.toggle("is-active", panel.dataset.drawerViewPanel === view);
  });
}

function animateUserSwitch() {
  const drawer = document.querySelector(".drawer-panel");
  drawer.classList.remove("is-switching");
  void drawer.offsetWidth;
  drawer.classList.add("is-switching");
  window.setTimeout(() => drawer.classList.remove("is-switching"), 520);
}

function hydrateForms() {
  const user = activeUser();
  Object.entries(user.profile || {}).forEach(([key, value]) => {
    const field = document.querySelector(`#profileForm [name="${key}"]`);
    if (field) field.value = value;
  });
  Object.entries(user.maxes || {}).forEach(([key, value]) => {
    const field = document.querySelector(`#maxForm [name="${key}"]`);
    if (field) field.value = value || "";
  });
  updateUnitLabels();
}

function normalizeState(raw) {
  if (Array.isArray(raw?.users) && raw.users.length) {
    const users = raw.users.map(normalizeUser);
    return {
      users,
      activeUserId: users.some((user) => user.id === raw.activeUserId) ? raw.activeUserId : users[0].id,
    };
  }

  const user = normalizeUser({
    id: "user-default",
    profile: raw?.profile || defaultProfile,
    maxes: raw?.maxes || {},
    plan: raw?.plan || null,
    history: raw?.history || [],
    completedDates: raw?.completedDates || {},
    todayChecks: raw?.todayChecks || {},
  });
  return { users: [user], activeUserId: user.id };
}

function normalizeUser(user) {
  const next = {
    id: user.id || `user-${Date.now()}`,
    profile: normalizeProfile(user.profile || defaultProfile),
    maxes: user.maxes || {},
    plan: user.plan || null,
    history: Array.isArray(user.history) ? user.history : [],
    completedDates: user.completedDates || {},
    todayChecks: user.todayChecks || {},
  };
  next.history.forEach((item) => {
    if (item.isoDate) next.completedDates[item.isoDate] = true;
  });
  if (Object.values(next.maxes).some((value) => number(value) > 0)) next.plan = buildPlan(next.profile, next.maxes);
  return next;
}

function normalizeProfile(profile) {
  return {
    nickname: profile.nickname || "나",
    gender: ["male", "female", "other"].includes(profile.gender) ? profile.gender : "female",
    height: number(profile.height) || 160,
    weight: number(profile.weight) || 50,
    unit: profile.unit === "lb" ? "lb" : "kg",
    days: number(profile.days) || 6,
    goal: profile.goal || "olympic",
    recovery: profile.recovery || "normal",
    intensity: ["easy", "normal", "hard", "max"].includes(profile.intensity) ? profile.intensity : "normal",
  };
}

function replaceState(next) {
  Object.keys(state).forEach((key) => delete state[key]);
  Object.assign(state, next);
}

function rebuildPlanIfPossible(user) {
  if (Object.values(user.maxes || {}).some((value) => number(value) > 0)) user.plan = buildPlan(user.profile, user.maxes);
}

function convertStoredWeights(user, fromUnit, toUnit) {
  const factor = fromUnit === "kg" && toUnit === "lb" ? 2.20462 : fromUnit === "lb" && toUnit === "kg" ? 1 / 2.20462 : 1;
  Object.keys(user.maxes || {}).forEach((key) => {
    if (user.maxes[key]) user.maxes[key] = roundLoad(user.maxes[key] * factor, toUnit);
  });
}

function updateUnitLabels() {
  const unitLabel = unit(activeUser().profile);
  document.querySelectorAll("#maxForm input").forEach((input) => {
    input.placeholder = unitLabel;
  });
}

function loadState() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) || {};
  } catch {
    return {};
  }
}

function persistLocalState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function saveState(message, show = true) {
  persistLocalState();
  queueRemoteSync();
  if (show && message) showToast(message);
}

function showToast(message) {
  const toast = document.querySelector("#toast");
  toast.textContent = message;
  toast.classList.add("is-visible");
  window.clearTimeout(showToast.timer);
  showToast.timer = window.setTimeout(() => toast.classList.remove("is-visible"), 2200);
}

function launchConfetti() {
  const layer = document.querySelector("#confettiLayer");
  const colors = ["#1ed760", "#ffffff", "#539df5", "#ffa42b", "#f3727f"];
  layer.innerHTML = "";

  for (let index = 0; index < 32; index += 1) {
    const piece = document.createElement("span");
    const angle = (Math.PI * 2 * index) / 32;
    const distance = 90 + Math.random() * 120;
    piece.style.setProperty("--x", `${Math.cos(angle) * distance}px`);
    piece.style.setProperty("--y", `${Math.sin(angle) * distance - 80}px`);
    piece.style.setProperty("--r", `${Math.random() * 360}deg`);
    piece.style.background = colors[index % colors.length];
    layer.appendChild(piece);
  }

  layer.classList.remove("is-active");
  void layer.offsetWidth;
  layer.classList.add("is-active");
  window.setTimeout(() => {
    layer.classList.remove("is-active");
    layer.innerHTML = "";
  }, 1000);
}

function number(value) {
  return Number.parseFloat(value) || 0;
}

function roundToHalf(value) {
  return Math.round(value * 2) / 2;
}

function roundToTenth(value) {
  return Math.round(value * 10) / 10;
}

function roundToNearest(value, step) {
  return Math.round(value / step) * step;
}

function roundLoad(value, targetUnit = unit(activeUser().profile)) {
  if (targetUnit === "lb") return Math.round(value / 5) * 5;
  return roundToHalf(value);
}

function unit(profile = {}) {
  return profile.unit === "lb" ? "lb" : "kg";
}

function isoDate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function addDays(date, days) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function formatKoreanDate(value) {
  const date = new Date(`${value}T00:00:00`);
  return `${date.getMonth() + 1}월 ${date.getDate()}일`;
}
