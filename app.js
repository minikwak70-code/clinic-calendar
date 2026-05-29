const weekdays = [
  { key: "sun", label: "일" },
  { key: "mon", label: "월" },
  { key: "tue", label: "화" },
  { key: "wed", label: "수" },
  { key: "thu", label: "목" },
  { key: "fri", label: "금" },
  { key: "sat", label: "토" },
];

const typeMeta = {
  regular: { label: "일반진료", className: "regular", color: "#16816f" },
  night: { label: "야간진료", className: "night", color: "#7c6bc9" },
  extended: { label: "연장진료", className: "extended", color: "#c8912f" },
  closed: { label: "휴무일", className: "closed", color: "#d84949" },
  notice: { label: "안내", className: "regular", color: "#16816f" },
};

const defaultState = {
  clinicName: "공덕경희한의원",
  clinicNote: "진료 일정은 병원 사정에 따라 변경될 수 있습니다.",
  month: getMonthValue(new Date()),
  showAdjacentMonths: true,
  weekly: {
    sun: { status: "closed", start: "09:00", end: "13:00" },
    mon: { status: "regular", start: "09:30", end: "18:30" },
    tue: { status: "night", start: "09:30", end: "20:30" },
    wed: { status: "regular", start: "09:30", end: "18:30" },
    thu: { status: "extended", start: "09:30", end: "19:30" },
    fri: { status: "regular", start: "09:30", end: "18:30" },
    sat: { status: "regular", start: "09:00", end: "14:00" },
  },
  specials: [],
};

const els = {
  clinicName: document.querySelector("#clinicName"),
  clinicNote: document.querySelector("#clinicNote"),
  monthInput: document.querySelector("#monthInput"),
  showAdjacentMonths: document.querySelector("#showAdjacentMonths"),
  weekdayRows: document.querySelector("#weekdayRows"),
  specialDate: document.querySelector("#specialDate"),
  specialType: document.querySelector("#specialType"),
  specialText: document.querySelector("#specialText"),
  specialList: document.querySelector("#specialList"),
  calendarGrid: document.querySelector("#calendarGrid"),
  calendarClinic: document.querySelector("#calendarClinic"),
  calendarNote: document.querySelector("#calendarNote"),
  calendarYear: document.querySelector("#calendarYear"),
  calendarMonth: document.querySelector("#calendarMonth"),
  previewTitle: document.querySelector("#previewTitle"),
  addSpecial: document.querySelector("#addSpecial"),
  applyTemplate: document.querySelector("#applyTemplate"),
  prevMonth: document.querySelector("#prevMonth"),
  nextMonth: document.querySelector("#nextMonth"),
  todayMonth: document.querySelector("#todayMonth"),
  downloadPng: document.querySelector("#downloadPng"),
  exportCanvas: document.querySelector("#exportCanvas"),
};

let state = loadState();

init();

function init() {
  renderWeekdayRows();
  bindStaticEvents();
  syncForm();
  renderAll();
}

function bindStaticEvents() {
  [els.clinicName, els.clinicNote, els.monthInput, els.showAdjacentMonths].forEach((input) => {
    input.addEventListener("input", () => {
      state.clinicName = els.clinicName.value.trim();
      state.clinicNote = els.clinicNote.value.trim();
      state.month = els.monthInput.value || getMonthValue(new Date());
      state.showAdjacentMonths = els.showAdjacentMonths.checked;
      persistAndRender();
    });
  });

  els.addSpecial.addEventListener("click", addSpecial);
  els.applyTemplate.addEventListener("click", () => {
    state.weekly = structuredClone(defaultState.weekly);
    syncWeekdayRows();
    persistAndRender();
  });
  els.prevMonth.addEventListener("click", () => shiftMonth(-1));
  els.nextMonth.addEventListener("click", () => shiftMonth(1));
  els.specialType.addEventListener("change", updateSpecialPlaceholder);
  els.todayMonth.addEventListener("click", () => {
    state.month = getMonthValue(new Date());
    els.monthInput.value = state.month;
    persistAndRender();
  });
  els.downloadPng.addEventListener("click", downloadCalendar);
  updateSpecialPlaceholder();
}

function renderWeekdayRows() {
  els.weekdayRows.innerHTML = weekdays
    .map(
      (day) => `
        <div class="weekday-row" data-day="${day.key}">
          <span class="weekday-name">${day.label}</span>
          <input type="time" data-field="start" aria-label="${day.label}요일 시작 시간" />
          <input type="time" data-field="end" aria-label="${day.label}요일 종료 시간" />
          <select data-field="status" aria-label="${day.label}요일 진료 구분">
            <option value="regular">일반</option>
            <option value="night">야간</option>
            <option value="extended">연장</option>
            <option value="closed">휴무</option>
          </select>
        </div>
      `,
    )
    .join("");

  els.weekdayRows.addEventListener("input", updateWeeklyFromRows);
}

function syncForm() {
  els.clinicName.value = state.clinicName;
  els.clinicNote.value = state.clinicNote;
  els.monthInput.value = state.month;
  els.showAdjacentMonths.checked = state.showAdjacentMonths;
  syncWeekdayRows();
}

function syncWeekdayRows() {
  weekdays.forEach((day) => {
    const row = els.weekdayRows.querySelector(`[data-day="${day.key}"]`);
    const data = state.weekly[day.key];
    row.querySelector('[data-field="start"]').value = data.start;
    row.querySelector('[data-field="end"]').value = data.end;
    row.querySelector('[data-field="status"]').value = data.status;
  });
}

function updateWeeklyFromRows(event) {
  const row = event.target.closest(".weekday-row");
  if (!row) return;
  const day = row.dataset.day;
  state.weekly[day] = {
    start: row.querySelector('[data-field="start"]').value,
    end: row.querySelector('[data-field="end"]').value,
    status: row.querySelector('[data-field="status"]').value,
  };
  persistAndRender();
}

function addSpecial() {
  const date = els.specialDate.value;
  const type = els.specialType.value;
  const text = els.specialText.value.trim();
  if (!date) {
    els.specialDate.focus();
    return;
  }

  const existingIndex = state.specials.findIndex((item) => item.date === date);
  const item = { date, type, text };
  if (existingIndex >= 0) {
    state.specials[existingIndex] = item;
  } else {
    state.specials.push(item);
  }
  state.specials.sort((a, b) => a.date.localeCompare(b.date));
  els.specialText.value = "";
  persistAndRender();
}

function updateSpecialPlaceholder() {
  const placeholders = {
    closed: "예: 학회 참석 / 내부공사 / 명절 휴진",
    night: "예: 14:00-21:00",
    extended: "예: 09:30-20:00",
    notice: "예: 원장님 세미나로 접수 조기마감",
  };
  els.specialText.placeholder = placeholders[els.specialType.value] || placeholders.notice;
}

function renderAll() {
  renderSpecials();
  renderCalendar();
}

function renderSpecials() {
  if (!state.specials.length) {
    els.specialList.innerHTML = "";
    return;
  }

  els.specialList.innerHTML = state.specials
    .map((item) => {
      const meta = typeMeta[item.type] || typeMeta.notice;
      return `
        <div class="special-item">
          <div>
            <strong>${formatDateLabel(item.date)} · ${meta.label}</strong>
            <span>${escapeHtml(item.text || "별도 메모 없음")}</span>
          </div>
          <button class="remove-button" type="button" data-remove="${item.date}" aria-label="${item.date} 삭제">×</button>
        </div>
      `;
    })
    .join("");

  els.specialList.querySelectorAll("[data-remove]").forEach((button) => {
    button.addEventListener("click", () => {
      state.specials = state.specials.filter((item) => item.date !== button.dataset.remove);
      persistAndRender();
    });
  });
}

function renderCalendar() {
  const { year, month } = parseMonth(state.month);
  const titleMonth = `${year}년 ${String(month).padStart(2, "0")}월`;
  els.previewTitle.textContent = titleMonth;
  els.calendarClinic.textContent = state.clinicName || defaultState.clinicName;
  els.calendarNote.textContent = state.clinicNote || defaultState.clinicNote;
  els.calendarYear.textContent = String(year);
  els.calendarMonth.textContent = String(month).padStart(2, "0");

  const days = buildCalendarDays(year, month);
  els.calendarGrid.innerHTML = days.map((day) => renderDayCell(day, year, month)).join("");
}

function renderDayCell(day, currentYear, currentMonth) {
  const isCurrentMonth = day.date.getFullYear() === currentYear && day.date.getMonth() === currentMonth - 1;
  if (!isCurrentMonth && !state.showAdjacentMonths) {
    return '<article class="day-cell is-empty" aria-hidden="true"></article>';
  }

  const info = getDayInfo(day.date);
  const today = new Date();
  const isToday = isSameDate(day.date, today);
  const typeClass = `type-${info.type === "notice" ? "regular" : info.type}`;
  const sundayMark = day.date.getDay() === 0 ? "<small>휴</small>" : "";

  return `
    <article class="day-cell ${isCurrentMonth ? "" : "is-muted"} ${isToday ? "is-today" : ""} ${typeClass}">
      <div class="date-number"><span>${day.date.getDate()}</span>${sundayMark}</div>
      <div class="schedule-info">
        <span class="schedule-tag ${typeMeta[info.type].className}">${typeMeta[info.type].label}</span>
        <span class="schedule-time">${escapeHtml(info.time)}</span>
        ${info.memo ? `<span class="schedule-memo">${escapeHtml(info.memo)}</span>` : ""}
      </div>
    </article>
  `;
}

function getDayInfo(date) {
  const dateKey = toDateKey(date);
  const special = state.specials.find((item) => item.date === dateKey);
  const dayKey = weekdays[date.getDay()].key;
  const weekly = state.weekly[dayKey];

  if (special?.type === "closed") {
    return { type: "closed", time: "휴진", memo: special.text };
  }

  if (weekly.status === "closed") {
    return { type: "closed", time: "휴진", memo: special?.text || "" };
  }

  if (special?.type && special.type !== "notice") {
    return {
      type: special.type,
      time: special.text || `${weekly.start}-${weekly.end}`,
      memo: "특정일 일정",
    };
  }

  return {
    type: weekly.status,
    time: `${weekly.start}-${weekly.end}`,
    memo: special?.text || "",
  };
}

function downloadCalendar() {
  const canvas = els.exportCanvas;
  const { year, month } = parseMonth(state.month);
  const rowCount = getExportDays(year, month).length / 7;
  canvas.width = 2400;
  canvas.height = 520 + rowCount * 220;
  const ctx = canvas.getContext("2d");
  drawExport(ctx, canvas.width, canvas.height);

  const link = document.createElement("a");
  const clinic = sanitizeFileName(state.clinicName || "clinic");
  link.download = `${clinic}-${state.month}-schedule.png`;
  link.href = canvas.toDataURL("image/png");
  link.click();
}

function drawExport(ctx, width, height) {
  const { year, month } = parseMonth(state.month);
  const pad = 84;
  const cardX = 54;
  const cardY = 54;
  const cardW = width - cardX * 2;
  const cardH = height - cardY * 2;
  const gridX = pad;
  const gridY = 365;
  const gap = 16;
  const days = getExportDays(year, month);
  const rowCount = days.length / 7;
  const cellW = (width - pad * 2 - gap * 6) / 7;
  const cellH = (height - gridY - pad - gap * (rowCount - 1)) / rowCount;

  ctx.clearRect(0, 0, width, height);
  ctx.fillStyle = "#f4f7f3";
  ctx.fillRect(0, 0, width, height);
  drawRoundRect(ctx, cardX, cardY, cardW, cardH, 30, "#fffdfa", "#dfe6e2", 3);

  ctx.fillStyle = "#16816f";
  ctx.font = "800 38px Malgun Gothic, Apple SD Gothic Neo, sans-serif";
  drawExportText(ctx, "월간 진료 일정", pad, 142, { tracking: -1.4 });

  ctx.fillStyle = "#17211f";
  ctx.font = "900 88px Malgun Gothic, Apple SD Gothic Neo, sans-serif";
  drawExportText(ctx, state.clinicName || defaultState.clinicName, pad, 238, { tracking: -3.2 });

  drawRoundRect(ctx, width - 330, 100, 230, 180, 26, "#f7faf6", "#dfe6e2", 3);
  ctx.fillStyle = "#66736f";
  ctx.font = "900 34px Malgun Gothic, Apple SD Gothic Neo, sans-serif";
  ctx.textAlign = "center";
  ctx.fillText(String(year), width - 215, 156);
  ctx.fillStyle = "#17211f";
  ctx.font = "900 82px Malgun Gothic, Apple SD Gothic Neo, sans-serif";
  ctx.fillText(String(month).padStart(2, "0"), width - 215, 248);
  ctx.textAlign = "left";

  const weekNames = ["일", "월", "화", "수", "목", "금", "토"];
  ctx.fillStyle = "#66736f";
  ctx.font = "900 32px Malgun Gothic, Apple SD Gothic Neo, sans-serif";
  weekNames.forEach((name, index) => {
    ctx.textAlign = "center";
    drawExportText(ctx, name, gridX + index * (cellW + gap) + cellW / 2, gridY - 44, { tracking: -1.2 });
  });
  ctx.textAlign = "left";

  days.forEach((day, index) => {
    const col = index % 7;
    const row = Math.floor(index / 7);
    const x = gridX + col * (cellW + gap);
    const y = gridY + row * (cellH + gap);
    const current = day.date.getMonth() === month - 1;
    if (!current && !state.showAdjacentMonths) {
      drawRoundRect(ctx, x, y, cellW, cellH, 14, "#fbfcfa", "#edf1ee");
      return;
    }
    drawExportDay(ctx, day.date, x, y, cellW, cellH, current);
  });
}

function drawExportDay(ctx, date, x, y, w, h, current) {
  const info = getDayInfo(date);
  const meta = typeMeta[info.type] || typeMeta.regular;
  ctx.globalAlpha = current ? 1 : 0.42;
  drawRoundRect(ctx, x, y, w, h, 18, "#ffffff", "#dfe6e2", 3);
  ctx.fillStyle = meta.color;
  roundTopBar(ctx, x, y, w, 9, 18);

  ctx.fillStyle = "#17211f";
  ctx.font = "900 42px Malgun Gothic, Apple SD Gothic Neo, sans-serif";
  ctx.fillText(String(date.getDate()), x + 26, y + 64);

  drawPill(ctx, x + 26, y + 86, meta.label, meta.color);
  ctx.fillStyle = "#17211f";
  ctx.font = "900 28px Malgun Gothic, Apple SD Gothic Neo, sans-serif";
  drawExportText(ctx, fitText(ctx, info.time, w - 52), x + 26, y + 166, { tracking: -0.8 });

  if (info.memo) {
    ctx.fillStyle = "#66736f";
    ctx.font = "700 23px Malgun Gothic, Apple SD Gothic Neo, sans-serif";
    drawExportText(ctx, fitText(ctx, info.memo, w - 52), x + 26, y + 202, { tracking: -0.8 });
  }
  ctx.globalAlpha = 1;
}

function drawLegend(ctx, x, y) {
  const items = ["regular", "night", "extended", "closed"];
  let cursor = x;
  ctx.font = "900 28px Malgun Gothic, Apple SD Gothic Neo, sans-serif";
  items.forEach((key) => {
    const meta = typeMeta[key];
    ctx.fillStyle = meta.color;
    ctx.beginPath();
    ctx.arc(cursor + 12, y - 10, 11, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#66736f";
    drawExportText(ctx, meta.label, cursor + 34, y, { tracking: -0.8 });
    cursor += 176;
  });
}

function drawPill(ctx, x, y, text, color) {
  ctx.font = "900 24px Malgun Gothic, Apple SD Gothic Neo, sans-serif";
  const width = measureExportText(ctx, text, -0.9) + 34;
  drawRoundRect(ctx, x, y, width, 42, 21, color, color);
  ctx.fillStyle = "#ffffff";
  drawExportText(ctx, text, x + 17, y + 29, { tracking: -0.9 });
}

function drawRoundRect(ctx, x, y, width, height, radius, fill, stroke, lineWidth = 2) {
  ctx.beginPath();
  ctx.roundRect(x, y, width, height, radius);
  ctx.fillStyle = fill;
  ctx.fill();
  if (stroke) {
    ctx.strokeStyle = stroke;
    ctx.lineWidth = lineWidth;
    ctx.stroke();
  }
}

function roundTopBar(ctx, x, y, width, height, radius) {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + width - radius, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
  ctx.lineTo(x + width, y + height);
  ctx.lineTo(x, y + height);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
  ctx.fill();
}

function buildCalendarDays(year, month) {
  const first = new Date(year, month - 1, 1);
  const start = new Date(first);
  start.setDate(first.getDate() - first.getDay());

  return Array.from({ length: 42 }, (_, index) => {
    const date = new Date(start);
    date.setDate(start.getDate() + index);
    return { date };
  });
}

function getExportDays(year, month) {
  const days = buildCalendarDays(year, month);
  if (state.showAdjacentMonths) return days;

  const weeks = [];
  for (let i = 0; i < days.length; i += 7) {
    const week = days.slice(i, i + 7);
    if (week.some((day) => day.date.getMonth() === month - 1)) {
      weeks.push(...week);
    }
  }
  return weeks;
}

function shiftMonth(delta) {
  const { year, month } = parseMonth(state.month);
  state.month = getMonthValue(new Date(year, month - 1 + delta, 1));
  els.monthInput.value = state.month;
  persistAndRender();
}

function persistAndRender() {
  localStorage.setItem("clinic-calendar-state", JSON.stringify(state));
  renderAll();
}

function loadState() {
  try {
    const saved = JSON.parse(localStorage.getItem("clinic-calendar-state"));
    return saved ? mergeState(defaultState, saved) : structuredClone(defaultState);
  } catch {
    return structuredClone(defaultState);
  }
}

function mergeState(base, saved) {
  return {
    ...structuredClone(base),
    ...saved,
    weekly: { ...structuredClone(base.weekly), ...(saved.weekly || {}) },
    specials: Array.isArray(saved.specials) ? saved.specials : [],
  };
}

function parseMonth(value) {
  const [year, month] = value.split("-").map(Number);
  return { year, month };
}

function getMonthValue(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function toDateKey(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function isSameDate(a, b) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

function formatDateLabel(dateText) {
  const date = new Date(`${dateText}T00:00:00`);
  return `${date.getMonth() + 1}.${date.getDate()} ${weekdays[date.getDay()].label}`;
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function sanitizeFileName(value) {
  return value.replace(/[\\/:*?"<>|]/g, "").trim() || "clinic";
}

function drawExportText(ctx, value, x, y, options = {}) {
  const text = String(value);
  const tracking = hasKorean(text) ? options.tracking ?? -1 : 0;
  if (!tracking) {
    ctx.fillText(text, x, y);
    return;
  }

  if ("letterSpacing" in ctx) {
    const previous = ctx.letterSpacing;
    ctx.letterSpacing = `${tracking}px`;
    ctx.fillText(text, x, y);
    ctx.letterSpacing = previous;
    return;
  }

  const previousAlign = ctx.textAlign;
  let cursor = x;
  if (previousAlign === "center") {
    cursor -= measureExportText(ctx, text, tracking) / 2;
  } else if (previousAlign === "right" || previousAlign === "end") {
    cursor -= measureExportText(ctx, text, tracking);
  }

  ctx.textAlign = "left";
  const chars = [...text];
  chars.forEach((char, index) => {
    ctx.fillText(char, cursor, y);
    cursor += ctx.measureText(char).width + (index === chars.length - 1 ? 0 : tracking);
  });
  ctx.textAlign = previousAlign;
}

function measureExportText(ctx, value, tracking = 0) {
  const chars = [...String(value)];
  const baseWidth = ctx.measureText(chars.join("")).width;
  return baseWidth + Math.max(0, chars.length - 1) * tracking;
}

function hasKorean(value) {
  return /[ㄱ-ㅎㅏ-ㅣ가-힣]/.test(String(value));
}

function fitText(ctx, value, maxWidth) {
  const text = String(value);
  const tracking = hasKorean(text) ? -0.8 : 0;
  if (measureExportText(ctx, text, tracking) <= maxWidth) return text;

  let end = text.length;
  while (end > 1 && measureExportText(ctx, `${text.slice(0, end)}...`, tracking) > maxWidth) {
    end -= 1;
  }
  return `${text.slice(0, end)}...`;
}

function trimForCanvas(value, max) {
  return value.length > max ? `${value.slice(0, max - 1)}...` : value;
}
