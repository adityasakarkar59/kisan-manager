
function showBootScreen() {
  const boot = document.getElementById("bootScreen");
  const login = document.getElementById("loginPage");
  const app = document.getElementById("mainApp");

  if (boot) boot.classList.remove("hidden");
  if (login) login.classList.add("hidden");
  if (app) app.classList.add("hidden");
}

function hideBootScreen() {
  const boot = document.getElementById("bootScreen");
  if (boot) boot.classList.add("hidden");
}

function showMainAppFromLocalSession() {
  const uid = localStorage.getItem("kisan_active_user_uid");
  const email = localStorage.getItem("kisan_active_user_email") || "Offline account";
  const name = localStorage.getItem("kisan_active_user_name") || "Farm Account";

  if (!uid) return false;

  window.kisanCurrentUser = {
    uid: uid,
    email: email,
    displayName: name,
    offlineSession: true
  };

  const boot = document.getElementById("bootScreen");
  const login = document.getElementById("loginPage");
  const app = document.getElementById("mainApp");
  const emailBox = document.getElementById("accountEmail");
  const nameBox = document.getElementById("accountName");
  const initialBox = document.getElementById("profileInitial");
  const initialBoxLarge = document.getElementById("profileInitialLarge");

  if (boot) boot.classList.add("hidden");
  if (login) login.classList.add("hidden");
  if (app) app.classList.remove("hidden");
  if (emailBox) emailBox.innerText = email;
  if (nameBox) nameBox.innerText = name;
  if (initialBox) initialBox.innerText = name.trim().charAt(0).toUpperCase() || "K";
  if (initialBoxLarge) initialBoxLarge.innerText = name.trim().charAt(0).toUpperCase() || "K";

  return true;
}

window.showMainAppFromLocalSession = showMainAppFromLocalSession;

function showLoginIfNoAuthAfterDelay() {
  setTimeout(function() {
    const boot = document.getElementById("bootScreen");
    const login = document.getElementById("loginPage");
    const app = document.getElementById("mainApp");

    if (!boot || boot.classList.contains("hidden")) return;

    if (!navigator.onLine && showMainAppFromLocalSession()) {
      return;
    }

    boot.classList.add("hidden");
    if (app) app.classList.add("hidden");
    if (login) login.classList.remove("hidden");
  }, 2500);
}


function openProfileMenu() {
  const menu = document.getElementById("profileMenu");
  if (menu) menu.classList.remove("hidden");
}

function closeProfileMenu() {
  const menu = document.getElementById("profileMenu");
  if (menu) menu.classList.add("hidden");
}

function toggleProfileMenu(event) {
  if (event) event.stopPropagation();

  const menu = document.getElementById("profileMenu");
  if (menu) menu.classList.toggle("hidden");
}

function togglePassword(inputId, button) {
  const input = document.getElementById(inputId);

  if (!input) return;

  if (input.type === "password") {
    input.type = "text";
    button.innerText = "Hide";
  } else {
    input.type = "password";
    button.innerText = "Show";
  }
}

document.addEventListener("click", function(event) {
  const menu = document.getElementById("profileMenu");
  const profileWrapper = document.querySelector(".profile-wrapper");

  if (!menu || !profileWrapper) return;

  if (!profileWrapper.contains(event.target)) {
    menu.classList.add("hidden");
  }
});
let currentMode = "tractor";
let openedCustomerId = null;
let openedCropDayId = null;

let activeForm = {
  type: "",
  customerId: null,
  workId: null,
  dayId: null,
  labourId: null
};

let customers = [];
let mirchiDays = [];

function generateId() {
  return Date.now() + Math.floor(Math.random() * 100000);
}

function showMessage(message) {
  let toast = document.getElementById("toastMessage");
  toast.innerText = message;
  toast.classList.remove("hidden");

  setTimeout(function() {
    toast.classList.add("hidden");
  }, 2200);
}

function openInlineForm(type, data) {
  activeForm = {
    type: type,
    customerId: data && data.customerId ? data.customerId : null,
    workId: data && data.workId ? data.workId : null,
    dayId: data && data.dayId ? data.dayId : null,
    labourId: data && data.labourId ? data.labourId : null
  };

  if (activeForm.customerId) openedCustomerId = activeForm.customerId;
  if (activeForm.dayId) openedCropDayId = activeForm.dayId;

  updateAllPages();

  setTimeout(function() {
    const forms = document.querySelectorAll(".inline-form");
    const form = forms.length ? forms[forms.length - 1] : null;

    if (form) {
      form.scrollIntoView({
        behavior: "smooth",
        block: "center"
      });

      form.classList.add("form-highlight");

      setTimeout(function() {
        form.classList.remove("form-highlight");
      }, 1200);
    }
  }, 120);
}

function closeInlineForm() {
  activeForm = {
    type: "",
    customerId: null,
    workId: null,
    dayId: null,
    labourId: null
  };

  updateAllPages();
}

function isActiveForm(type, data) {
  if (activeForm.type !== type) return false;

  if (data.customerId && activeForm.customerId !== data.customerId) return false;
  if (data.workId && activeForm.workId !== data.workId) return false;
  if (data.dayId && activeForm.dayId !== data.dayId) return false;
  if (data.labourId && activeForm.labourId !== data.labourId) return false;

  return true;
}

function normalizeName(name) {
  return String(name || "").trim().toLowerCase().replace(/\s+/g, " ");
}

function getCustomerFullName(customer) {
  let firstName = String(customer.firstName || "").trim();
  let lastName = String(customer.lastName || "").trim();

  if (firstName !== "" || lastName !== "") {
    return `${firstName} ${lastName}`.trim();
  }

  return String(customer.name || "").trim();
}

function splitOldName(customer) {
  if ((customer.firstName || customer.lastName) || !customer.name) return;

  let parts = String(customer.name).trim().split(/\s+/);
  customer.firstName = parts[0] || "";
  customer.lastName = parts.slice(1).join(" ") || "";
}

function makeNameKey(firstName, lastName) {
  return normalizeName(`${firstName || ""} ${lastName || ""}`);
}

function levenshteinDistance(a, b) {
  a = normalizeName(a);
  b = normalizeName(b);

  let matrix = [];

  for (let i = 0; i <= b.length; i++) matrix[i] = [i];
  for (let j = 0; j <= a.length; j++) matrix[0][j] = j;

  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
      }
    }
  }

  return matrix[b.length][a.length];
}

function customerMatchesSearch(customer, searchValue) {
  let fullName = normalizeName(getCustomerFullName(customer));
  let query = normalizeName(searchValue);

  if (query === "") return false;
  if (fullName.includes(query)) return true;

  let nameParts = fullName.split(" ");

  return nameParts.some(function(part) {
    if (part.includes(query)) return true;
    if (query.length >= 3 && levenshteinDistance(part, query) <= 2) return true;
    return false;
  });
}

function getTodayDate() {
  let today = new Date();
  let day = String(today.getDate()).padStart(2, "0");
  let month = String(today.getMonth() + 1).padStart(2, "0");
  let year = today.getFullYear();

  return `${day}-${month}-${year}`;
}

function formatDateNumberInput(value) {
  let digits = String(value || "").replace(/\D/g, "").slice(0, 8);

  if (digits.length <= 2) {
    return digits;
  }

  if (digits.length <= 4) {
    return digits.slice(0, 2) + "-" + digits.slice(2);
  }

  return digits.slice(0, 2) + "-" + digits.slice(2, 4) + "-" + digits.slice(4);
}

function normalizeDateForSave(value, fallbackDate) {
  let formatted = formatDateNumberInput(value);

  if (isValidDateFormat(formatted)) {
    return formatted;
  }

  return fallbackDate || getTodayDate();
}

document.addEventListener("input", function(event) {
  if (!event.target.classList || !event.target.classList.contains("date-input")) {
    return;
  }

  event.target.value = formatDateNumberInput(event.target.value);
});

document.addEventListener("blur", function(event) {
  if (!event.target.classList || !event.target.classList.contains("date-input")) {
    return;
  }

  event.target.value = formatDateNumberInput(event.target.value);
}, true);

function cleanNumber(value) {
  value = String(value || "").trim().replace(/,/g, "");
  if (value === "") return 0;

  let number = Number(value);
  if (isNaN(number)) return 0;

  return Number(number.toFixed(2));
}

function money(value) {
  return Number(value || 0).toFixed(2).replace(/\.00$/, "");
}

function textOrEmpty(value) {
  value = String(value || "").trim();
  return value === "" ? "Not added" : value;
}

function isValidDateFormat(dateValue) {
  let pattern = /^(\d{2})-(\d{2})-(\d{4})$/;
  if (!pattern.test(dateValue)) return false;

  let parts = dateValue.split("-");
  let day = Number(parts[0]);
  let month = Number(parts[1]);
  let year = Number(parts[2]);

  let date = new Date(year, month - 1, day);

  return (
    date.getDate() === day &&
    date.getMonth() === month - 1 &&
    date.getFullYear() === year
  );
}

function getDayNameFromDate(dateValue) {
  if (!isValidDateFormat(dateValue)) return "";

  let parts = dateValue.split("-");
  let day = Number(parts[0]);
  let month = Number(parts[1]);
  let year = Number(parts[2]);

  let date = new Date(year, month - 1, day);
  let days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

  return days[date.getDay()];
}

function getAutoUnit(tool) {
  if (tool === "Thresher") return "Quintal";
  if (tool === "Trolly") return "Trip";
  return "Acre";
}

function getCropDisplayName(type) {
  if (type === "cotton") return "Cotton";
  return "Mirchii";
}

async function saveTractorStorage() {
  await saveCustomersDB(customers);
  if (window.syncNow) window.syncNow();
}

async function saveMirchiStorage() {
  await saveMirchiDaysDB(mirchiDays);
  if (window.syncNow) window.syncNow();
}

function ensureOldDue(customer) {
  if (!customer.oldDue) {
    customer.oldDue = {
      amount: 0,
      date: "",
      note: "",
      payments: []
    };
  }

  if (!customer.oldDue.payments) customer.oldDue.payments = [];
  customer.oldDue.amount = cleanNumber(customer.oldDue.amount);
}

function getOldDueAmount(customer) {
  ensureOldDue(customer);
  return cleanNumber(customer.oldDue.amount);
}

function getOldDuePaid(customer) {
  ensureOldDue(customer);

  let paid = 0;

  customer.oldDue.payments.forEach(function(payment) {
    paid += cleanNumber(payment.amount);
  });

  return Number(paid.toFixed(2));
}

function getOldDueBalance(customer) {
  return Number((getOldDueAmount(customer) - getOldDuePaid(customer)).toFixed(2));
}

function migrateOldData() {
  customers.forEach(function(customer) {
    if (!customer.id) customer.id = generateId();

    splitOldName(customer);
    ensureOldDue(customer);

    if (!customer.works) customer.works = [];

    customer.works.forEach(function(work) {
      if (!work.id) work.id = generateId();
      if (!work.payments) work.payments = [];
      if (work.landName === undefined) work.landName = "";
      if (work.toolUsed === undefined) work.toolUsed = "";
      if (work.cropType === "Herbara") work.cropType = "Chena";

      if (work.workUnit === undefined || work.workUnit === "Tons") {
        work.workUnit = getAutoUnit(work.toolUsed);
      }

      if (work.total === undefined) {
        work.total = cleanNumber(work.quantity) * cleanNumber(work.rate);
      }
    });
  });

  mirchiDays.forEach(function(day) {
    if (!day.id) day.id = generateId();
    if (!day.cropType) day.cropType = "mirchi";
    if (day.ratePerKg === undefined) day.ratePerKg = 0;
    if (!day.labours) day.labours = [];

    day.labours.forEach(function(labour) {
      if (!labour.id) labour.id = generateId();
      labour.kg = cleanNumber(labour.kg);
    });
  });
}

function mergeDuplicateCustomers() {
  let merged = [];

  customers.forEach(function(customer) {
    splitOldName(customer);
    ensureOldDue(customer);

    let cleanName = makeNameKey(customer.firstName, customer.lastName);

    let existing = merged.find(function(c) {
      let existingName = makeNameKey(c.firstName, c.lastName);
      return cleanName !== "" && existingName === cleanName;
    });

    if (existing) {
      ensureOldDue(existing);

      if (!existing.phoneNumber && customer.phoneNumber) existing.phoneNumber = customer.phoneNumber;

      existing.works = existing.works.concat(customer.works || []);

      if (getOldDueAmount(customer) > 0) existing.oldDue.amount += getOldDueAmount(customer);

      if (customer.oldDue && customer.oldDue.payments) {
        existing.oldDue.payments = existing.oldDue.payments.concat(customer.oldDue.payments);
      }

      if (!existing.oldDue.note && customer.oldDue.note) existing.oldDue.note = customer.oldDue.note;
      if (!existing.oldDue.date && customer.oldDue.date) existing.oldDue.date = customer.oldDue.date;
    } else {
      merged.push(customer);
    }
  });

  customers = merged;
}

function setMode(mode) {
  currentMode = mode;
  activeForm.type = "";

  document.getElementById("tractorModeBtn").classList.remove("active-mode");
  document.getElementById("mirchiModeBtn").classList.remove("active-mode");
  document.getElementById("cottonModeBtn").classList.remove("active-mode");

  document.getElementById("tractorHome").classList.add("hidden");
  document.getElementById("cropHome").classList.add("hidden");

  document.getElementById("tractorAdd").classList.add("hidden");
  document.getElementById("cropAdd").classList.add("hidden");

  if (mode === "tractor") {
    document.getElementById("tractorModeBtn").classList.add("active-mode");
    document.getElementById("tractorHome").classList.remove("hidden");
    document.getElementById("tractorAdd").classList.remove("hidden");

    document.getElementById("headerText").innerText = "Tractor Work & Payment Record";
    document.getElementById("reportTitle").innerText = "Tractor Report";
  }

  if (mode === "mirchi") {
    document.getElementById("mirchiModeBtn").classList.add("active-mode");
    document.getElementById("cropHome").classList.remove("hidden");
    document.getElementById("cropAdd").classList.remove("hidden");

    document.getElementById("headerText").innerText = "Mirchii Labour Weight Record";
    document.getElementById("reportTitle").innerText = "Mirchii Report";
    document.getElementById("cropSearchTitle").innerText = "Search Mirchii Date / Labour";
    document.getElementById("cropListTitle").innerText = "Day Wise Mirchii Weight";
    document.getElementById("cropAddTitle").innerText = "Create Mirchii Day Record";
  }

  if (mode === "cotton") {
    document.getElementById("cottonModeBtn").classList.add("active-mode");
    document.getElementById("cropHome").classList.remove("hidden");
    document.getElementById("cropAdd").classList.remove("hidden");

    document.getElementById("headerText").innerText = "Cotton Labour Weight Record";
    document.getElementById("reportTitle").innerText = "Cotton Report";
    document.getElementById("cropSearchTitle").innerText = "Search Cotton Date / Labour";
    document.getElementById("cropListTitle").innerText = "Day Wise Cotton Weight";
    document.getElementById("cropAddTitle").innerText = "Create Cotton Day Record";
  }

  updateAllPages();
}

function handleToolChange() {
  let tool = document.getElementById("toolUsed").value;
  let cropBox = document.getElementById("cropBox");

  cropBox.classList.add("hidden");

  if (tool === "Thresher") cropBox.classList.remove("hidden");

  updateUnitLabels();
  calculateTotal();
}

function updateUnitLabels() {
  let tool = document.getElementById("toolUsed").value;
  let unit = getAutoUnit(tool);

  if (unit === "Acre") {
    document.getElementById("quantityLabel").innerText = "Acres";
    document.getElementById("rateLabel").innerText = "Rate Per Acre";
  } else if (unit === "Trip") {
    document.getElementById("quantityLabel").innerText = "Trips";
    document.getElementById("rateLabel").innerText = "Rate Per Trip";
  } else if (unit === "Quintal") {
    document.getElementById("quantityLabel").innerText = "Quintals";
    document.getElementById("rateLabel").innerText = "Rate Per Quintal";
  }
}

function calculateTotal() {
  let quantity = cleanNumber(document.getElementById("quantity").value);
  let rate = cleanNumber(document.getElementById("rate").value);
  let total = quantity * rate;
  document.getElementById("total").value = money(total);
}

async function saveWork() {
  let firstName = document.getElementById("firstName").value.trim();
  let lastName = document.getElementById("lastName").value.trim();
  let phoneNumber = document.getElementById("phoneNumber").value.trim();
  let fieldName = document.getElementById("fieldName").value.trim();
  let toolUsed = document.getElementById("toolUsed").value;
  let cropType = document.getElementById("cropType").value;
  let workUnit = getAutoUnit(toolUsed);
  let quantity = cleanNumber(document.getElementById("quantity").value);
  let rate = cleanNumber(document.getElementById("rate").value);
  let total = Number((quantity * rate).toFixed(2));
  let workDate = document.getElementById("workDate").value.trim();
  let workNote = document.getElementById("workNote").value.trim();

  if (firstName === "" && lastName === "") {
    firstName = "Unnamed";
    lastName = "Customer";
  }

  workDate = normalizeDateForSave(workDate, getTodayDate());

  if (toolUsed === "") {
    toolUsed = "Not selected";
    workUnit = "Acre";
  }

  let existingCustomer = customers.find(function(c) {
    return makeNameKey(c.firstName, c.lastName) === makeNameKey(firstName, lastName);
  });

  let work = {
    id: generateId(),
    landName: fieldName,
    toolUsed: toolUsed,
    cropType: toolUsed === "Thresher" ? cropType : "",
    workUnit: workUnit,
    quantity: quantity,
    rate: rate,
    total: total,
    payments: [],
    date: workDate,
    note: workNote
  };

  if (existingCustomer) {
    ensureOldDue(existingCustomer);
    existingCustomer.phoneNumber = phoneNumber || existingCustomer.phoneNumber || "";
    existingCustomer.works.push(work);
    openedCustomerId = existingCustomer.id;
  } else {
    let newCustomer = {
      id: generateId(),
      firstName: firstName,
      lastName: lastName,
      name: `${firstName} ${lastName}`.trim(),
      phoneNumber: phoneNumber,
      oldDue: {
        amount: 0,
        date: "",
        note: "",
        payments: []
      },
      works: [work]
    };

    customers.push(newCustomer);
    openedCustomerId = newCustomer.id;
  }

  mergeDuplicateCustomers();
  await saveTractorStorage();

  showMessage("Tractor work saved successfully");

  clearTractorForm();
  updateAllPages();
  showPage("homePage", "homeBtn");
}

function clearTractorForm() {
  document.getElementById("firstName").value = "";
  document.getElementById("lastName").value = "";
  document.getElementById("phoneNumber").value = "";
  document.getElementById("fieldName").value = "";
  document.getElementById("toolUsed").value = "";
  document.getElementById("cropType").value = "";
  document.getElementById("quantity").value = "";
  document.getElementById("rate").value = "";
  document.getElementById("total").value = "";
  document.getElementById("workNote").value = "";
  document.getElementById("workDate").value = getTodayDate();
  document.getElementById("cropBox").classList.add("hidden");
  updateUnitLabels();
}

function getWorkPaid(work) {
  let paid = 0;

  if (!work.payments) work.payments = [];

  work.payments.forEach(function(payment) {
    paid += cleanNumber(payment.amount);
  });

  return Number(paid.toFixed(2));
}

function getWorkBalance(work) {
  return Number((cleanNumber(work.total) - getWorkPaid(work)).toFixed(2));
}

function getWorksTotal(customer) {
  let total = 0;

  customer.works.forEach(function(work) {
    total += cleanNumber(work.total);
  });

  return Number(total.toFixed(2));
}

function getWorksPaid(customer) {
  let paid = 0;

  customer.works.forEach(function(work) {
    paid += getWorkPaid(work);
  });

  return Number(paid.toFixed(2));
}

function getCustomerTotal(customer) {
  return Number(getWorksTotal(customer).toFixed(2));
}

function getCustomerPaid(customer) {
  return Number((getWorksPaid(customer) + getOldDuePaid(customer)).toFixed(2));
}

function getCustomerBalance(customer) {
  let workBalance = getWorksTotal(customer) - getWorksPaid(customer);
  let oldDueBalance = getOldDueBalance(customer);

  return Number((workBalance + oldDueBalance).toFixed(2));
}

function createCustomerNameOnlyCard(customer) {
  if (openedCustomerId === customer.id) return createCustomerCard(customer);

  return `
    <div class="customer-card customer-name-card" onclick="openCustomerDetails(${customer.id})">
      <h3>${textOrEmpty(getCustomerFullName(customer))}</h3>
    </div>
  `;
}

function openCustomerDetails(customerId) {
  openedCustomerId = openedCustomerId === customerId ? null : customerId;
  activeForm.type = "";
  updateAllPages();

  if (document.getElementById("searchInput").value.trim() !== "") searchCustomer();
}

function createOldDueSection(customer) {
  ensureOldDue(customer);

  let oldDueAmount = getOldDueAmount(customer);
  let oldDuePaid = getOldDuePaid(customer);
  let oldDueBalance = getOldDueBalance(customer);

  let paymentHistory = "";

  if (!customer.oldDue.payments || customer.oldDue.payments.length === 0) {
    paymentHistory = `<p class="empty">No old due payment added yet</p>`;
  } else {
    customer.oldDue.payments.forEach(function(payment) {
      paymentHistory += `
        <div class="payment-card">
          <p><b>Date:</b> ${textOrEmpty(payment.date)}</p>
          <p><b>Paid:</b> ₹${money(payment.amount)}</p>
          <p><b>Note:</b> ${textOrEmpty(payment.note)}</p>
        </div>
      `;
    });
  }

  let formHTML = "";

  if (isActiveForm("editOldDue", { customerId: customer.id })) {
    formHTML = `
      <div class="inline-form">
        <h4>Add / Edit Old Due</h4>

        <label>Old Due Amount</label>
        <input type="text" inputmode="decimal" id="oldDueAmount_${customer.id}" value="${customer.oldDue.amount || ""}">

        <label>Old Due Date</label>
        <input type="text" inputmode="numeric" id="oldDueDate_${customer.id}" class="date-input" maxlength="10" value="${customer.oldDue.date || getTodayDate()}">

        <label>Old Due Note</label>
        <textarea id="oldDueNote_${customer.id}">${customer.oldDue.note || ""}</textarea>

        <div class="form-actions">
          <button onclick="saveOldDue(${customer.id})">Save</button>
          <button class="delete-btn" onclick="closeInlineForm()">Cancel</button>
        </div>
      </div>
    `;
  }

  if (isActiveForm("payOldDue", { customerId: customer.id })) {
    formHTML = `
      <div class="inline-form">
        <h4>Pay Old Due</h4>
        <p><b>Pending Old Due:</b> ₹${money(oldDueBalance)}</p>

        <label>Paid Amount</label>
        <input type="text" inputmode="decimal" id="oldDuePayAmount_${customer.id}">

        <label>Payment Date</label>
        <input type="text" inputmode="numeric" id="oldDuePayDate_${customer.id}" class="date-input" maxlength="10" value="${getTodayDate()}">

        <label>Payment Note</label>
        <textarea id="oldDuePayNote_${customer.id}">Old due payment received</textarea>

        <div class="form-actions">
          <button onclick="saveOldDuePayment(${customer.id})">Save</button>
          <button class="delete-btn" onclick="closeInlineForm()">Cancel</button>
        </div>
      </div>
    `;
  }

  let oldDueInfo = "";

  if (oldDueAmount > 0 || customer.oldDue.payments.length > 0) {
    oldDueInfo = `
      <div class="work-payment-box">
        <p><b>Date:</b> ${textOrEmpty(customer.oldDue.date)}</p>
        <p><b>Note:</b> ${textOrEmpty(customer.oldDue.note)}</p>

        <div class="amount-line">
          <span>Old Due Amount:</span>
          <span>₹${money(oldDueAmount)}</span>
        </div>

        <div class="amount-line paid">
          <span>Old Due Paid:</span>
          <span>₹${money(oldDuePaid)}</span>
        </div>

        <div class="amount-line balance">
          <span>Old Due Balance:</span>
          <span>₹${money(oldDueBalance)}</span>
        </div>
      </div>

      <h4 class="sub-title">Old Due Payment History</h4>
      ${paymentHistory}
    `;
  } else {
    oldDueInfo = `<p class="empty">No old due balance added</p>`;
  }

  return `
    <h4 class="sub-title">Old Due Balance</h4>

    ${oldDueInfo}

    <div class="actions two-col">
      <button class="edit-btn" onclick="openInlineForm('editOldDue', {customerId:${customer.id}})">Edit Old Due</button>
      <button class="add-pay-btn" onclick="openInlineForm('payOldDue', {customerId:${customer.id}})">Pay Old Due</button>
    </div>

    ${formHTML}
  `;
}

async function saveOldDue(customerId) {
  let customer = customers.find(c => c.id === customerId);
  if (!customer) return;

  let amount = cleanNumber(document.getElementById(`oldDueAmount_${customerId}`).value);
  let date = document.getElementById(`oldDueDate_${customerId}`).value.trim();
  let note = document.getElementById(`oldDueNote_${customerId}`).value.trim();

  date = normalizeDateForSave(date, getTodayDate());

  customer.oldDue.amount = amount;
  customer.oldDue.date = date;
  customer.oldDue.note = note;

  openedCustomerId = customer.id;
  activeForm.type = "";

  await saveTractorStorage();
  updateAllPages();
  showMessage("Old due saved");
}

async function saveOldDuePayment(customerId) {
  let customer = customers.find(c => c.id === customerId);
  if (!customer) return;

  let balance = getOldDueBalance(customer);
  let amount = cleanNumber(document.getElementById(`oldDuePayAmount_${customerId}`).value);
  let date = document.getElementById(`oldDuePayDate_${customerId}`).value.trim();
  let note = document.getElementById(`oldDuePayNote_${customerId}`).value.trim();

  if (amount <= 0) {
    showMessage("Enter valid amount");
    return;
  }

  if (amount > balance) {
    showMessage("Amount is greater than old due balance");
    return;
  }

  date = normalizeDateForSave(date, getTodayDate());

  customer.oldDue.payments.push({
    id: generateId(),
    amount: amount,
    date: date,
    note: note
  });

  openedCustomerId = customer.id;
  activeForm.type = "";

  await saveTractorStorage();
  updateAllPages();
  showMessage("Old due payment saved");
}

function createCustomerCard(customer) {
  ensureOldDue(customer);

  let total = getCustomerTotal(customer);
  let paid = getCustomerPaid(customer);
  let balance = getCustomerBalance(customer);

  let customerEditForm = "";

  if (isActiveForm("editCustomer", { customerId: customer.id })) {
    customerEditForm = `
      <div class="inline-form">
        <h4>Edit Customer</h4>

        <label>First Name</label>
        <input type="text" id="editFirstName_${customer.id}" value="${customer.firstName || ""}">

        <label>Last Name</label>
        <input type="text" id="editLastName_${customer.id}" value="${customer.lastName || ""}">

        <label>Phone Number</label>
        <input type="text" inputmode="numeric" id="editPhone_${customer.id}" value="${customer.phoneNumber || ""}">

        <div class="form-actions">
          <button onclick="saveCustomerEdit(${customer.id})">Save</button>
          <button class="delete-btn" onclick="closeInlineForm()">Cancel</button>
        </div>
      </div>
    `;
  }

  let workList = "";

  customer.works.forEach(function(work, index) {
    let cropLine = "";

    if (work.toolUsed === "Thresher") {
      cropLine = `<p><b>Crop:</b> ${textOrEmpty(work.cropType)}</p>`;
    }

    let workPaid = getWorkPaid(work);
    let workBalance = getWorkBalance(work);

    let paymentHistory = "";

    if (!work.payments || work.payments.length === 0) {
      paymentHistory = `<p class="empty">No payment added for this work</p>`;
    } else {
      work.payments.forEach(function(payment) {
        paymentHistory += `
          <div class="payment-card">
            <p><b>Date:</b> ${textOrEmpty(payment.date)}</p>
            <p><b>Paid:</b> ₹${money(payment.amount)}</p>
            <p><b>Note:</b> ${textOrEmpty(payment.note)}</p>
          </div>
        `;
      });
    }

    let workInlineForm = createWorkInlineForm(customer, work);

    workList += `
      <div class="work-box">
        <div class="work-header">
          <h4>Work ${index + 1}</h4>

          <div class="work-header-buttons">
            <button class="edit-btn" onclick="openInlineForm('editWork', {customerId:${customer.id}, workId:${work.id}})">Edit</button>
            <button class="add-pay-btn" onclick="openInlineForm('payWork', {customerId:${customer.id}, workId:${work.id}})">Pay</button>
          </div>
        </div>

        <p><b>Date:</b> ${textOrEmpty(work.date)}</p>
        <p><b>Field:</b> ${textOrEmpty(work.landName)}</p>
        <p><b>Tool:</b> ${textOrEmpty(work.toolUsed)}</p>
        ${cropLine}
        <p><b>Work:</b> ${money(work.quantity)} ${textOrEmpty(work.workUnit)}</p>
        <p><b>Rate:</b> ₹${money(work.rate)} / ${textOrEmpty(work.workUnit)}</p>
        <p><b>Note:</b> ${textOrEmpty(work.note)}</p>

        <div class="work-payment-box">
          <div class="amount-line">
            <span>Work Amount:</span>
            <span>₹${money(work.total)}</span>
          </div>

          <div class="amount-line paid">
            <span>Paid for this work:</span>
            <span>₹${money(workPaid)}</span>
          </div>

          <div class="amount-line balance">
            <span>Balance for this work:</span>
            <span>₹${money(workBalance)}</span>
          </div>
        </div>

        ${workInlineForm}

        <h4 class="sub-title">This Work Payment History</h4>
        ${paymentHistory}

        <div class="small-actions danger-zone">
          <button class="delete-btn" onclick="openInlineForm('deleteWork', {customerId:${customer.id}, workId:${work.id}})">Remove Work</button>
        </div>
      </div>
    `;
  });

  return `
    <div class="customer-card">
      <h3 onclick="openCustomerDetails(${customer.id})">${textOrEmpty(getCustomerFullName(customer))}</h3>
      <p><b>Phone:</b> ${textOrEmpty(customer.phoneNumber)}</p>

      <div class="amount-box">
        <div class="amount-line">
          <span>Total Amount:</span>
          <span>₹${money(total)}</span>
        </div>

        <div class="amount-line paid">
          <span>Total Paid:</span>
          <span>₹${money(paid)}</span>
        </div>

        <div class="amount-line balance">
          <span>Total Balance:</span>
          <span>₹${money(balance)}</span>
        </div>
      </div>

      ${createOldDueSection(customer)}

      <h4 class="sub-title">Work History</h4>
      ${workList || `<p class="empty">No work added yet</p>`}

      <div class="actions two-col">
        <button class="edit-btn" onclick="openInlineForm('editCustomer', {customerId:${customer.id}})">Edit Customer</button>
        <button class="add-work-btn" onclick="quickAddWork(${customer.id})">Add More Work</button>
      </div>

      <div class="actions">
        <button class="add-pay-btn" onclick="shareCustomerDetails(${customer.id})">Share Details</button>
      </div>

      ${customerEditForm}

      <div class="actions danger-zone">
        <button class="delete-btn" onclick="openInlineForm('deleteCustomer', {customerId:${customer.id}})">Delete Customer</button>
      </div>

      ${createDeleteCustomerForm(customer)}
    </div>
  `;
}

function createWorkInlineForm(customer, work) {
  if (isActiveForm("payWork", { customerId: customer.id, workId: work.id })) {
    return `
      <div class="inline-form">
        <h4>Add Work Payment</h4>
        <p><b>Work Balance:</b> ₹${money(getWorkBalance(work))}</p>

        <label>Paid Amount</label>
        <input type="text" inputmode="decimal" id="workPayAmount_${work.id}">

        <label>Payment Date</label>
        <input type="text" inputmode="numeric" id="workPayDate_${work.id}" class="date-input" maxlength="10" value="${getTodayDate()}">

        <label>Payment Note</label>
        <textarea id="workPayNote_${work.id}">Payment received</textarea>

        <div class="form-actions">
          <button onclick="saveWorkPayment(${customer.id}, ${work.id})">Save</button>
          <button class="delete-btn" onclick="closeInlineForm()">Cancel</button>
        </div>
      </div>
    `;
  }

  if (isActiveForm("editWork", { customerId: customer.id, workId: work.id })) {
    return `
      <div class="inline-form">
        <h4>Edit Work</h4>

        <label>Field Name</label>
        <input type="text" id="editWorkField_${work.id}" value="${work.landName || ""}">

        <label>Tool Used</label>
        <select id="editWorkTool_${work.id}">
          <option value="3-Nagger" ${work.toolUsed === "3-Nagger" ? "selected" : ""}>3-Nagger</option>
          <option value="2-Nagger" ${work.toolUsed === "2-Nagger" ? "selected" : ""}>2-Nagger</option>
          <option value="Rotavator" ${work.toolUsed === "Rotavator" ? "selected" : ""}>Rotavator</option>
          <option value="Panjhi" ${work.toolUsed === "Panjhi" ? "selected" : ""}>Panjhi</option>
          <option value="V-Phas" ${work.toolUsed === "V-Phas" ? "selected" : ""}>V-Phas</option>
          <option value="Seed Drill" ${work.toolUsed === "Seed Drill" ? "selected" : ""}>Seed Drill</option>
          <option value="Trolly" ${work.toolUsed === "Trolly" ? "selected" : ""}>Trolly</option>
          <option value="Thresher" ${work.toolUsed === "Thresher" ? "selected" : ""}>Thresher</option>
        </select>

        <label>Crop Type If Thresher</label>
        <input type="text" id="editWorkCrop_${work.id}" value="${work.cropType || ""}">

        <label>Quantity</label>
        <input type="text" inputmode="decimal" id="editWorkQuantity_${work.id}" value="${work.quantity || ""}">

        <label>Rate</label>
        <input type="text" inputmode="decimal" id="editWorkRate_${work.id}" value="${work.rate || ""}">

        <label>Date</label>
        <input type="text" inputmode="numeric" id="editWorkDate_${work.id}" class="date-input" maxlength="10" value="${work.date || getTodayDate()}">

        <label>Note</label>
        <textarea id="editWorkNote_${work.id}">${work.note || ""}</textarea>

        <div class="form-actions">
          <button onclick="saveWorkEdit(${customer.id}, ${work.id})">Save</button>
          <button class="delete-btn" onclick="closeInlineForm()">Cancel</button>
        </div>
      </div>
    `;
  }

  if (isActiveForm("deleteWork", { customerId: customer.id, workId: work.id })) {
    return `
      <div class="inline-form">
        <h4>Remove Work?</h4>
        <p><b>Field:</b> ${textOrEmpty(work.landName)}</p>
        <p><b>Tool:</b> ${textOrEmpty(work.toolUsed)}</p>
        <p><b>Amount:</b> ₹${money(work.total)}</p>

        <div class="form-actions">
          <button class="delete-btn" onclick="saveDeleteWork(${customer.id}, ${work.id})">Remove</button>
          <button onclick="closeInlineForm()">Cancel</button>
        </div>
      </div>
    `;
  }

  return "";
}

async function saveCustomerEdit(customerId) {
  let customer = customers.find(c => c.id === customerId);
  if (!customer) return;

  let firstName = document.getElementById(`editFirstName_${customerId}`).value.trim();
  let lastName = document.getElementById(`editLastName_${customerId}`).value.trim();
  let phone = document.getElementById(`editPhone_${customerId}`).value.trim();

  if (firstName === "" && lastName === "") {
    firstName = "Unnamed";
    lastName = "Customer";
  }

  customer.firstName = firstName;
  customer.lastName = lastName;
  customer.name = `${firstName} ${lastName}`.trim();
  customer.phoneNumber = phone;

  openedCustomerId = customer.id;
  activeForm.type = "";

  await saveTractorStorage();
  updateAllPages();
  showMessage("Customer updated");
}

async function saveWorkPayment(customerId, workId) {
  let customer = customers.find(c => c.id === customerId);
  if (!customer) return;

  let work = customer.works.find(w => w.id === workId);
  if (!work) return;

  let balance = getWorkBalance(work);
  let amount = cleanNumber(document.getElementById(`workPayAmount_${workId}`).value);
  let date = document.getElementById(`workPayDate_${workId}`).value.trim();
  let note = document.getElementById(`workPayNote_${workId}`).value.trim();

  if (amount <= 0) {
    showMessage("Enter valid amount");
    return;
  }

  if (amount > balance) {
    showMessage("Amount is greater than work balance");
    return;
  }

  date = normalizeDateForSave(date, getTodayDate());

  work.payments.push({
    id: generateId(),
    amount: amount,
    date: date,
    note: note
  });

  openedCustomerId = customer.id;
  activeForm.type = "";

  await saveTractorStorage();
  updateAllPages();
  showMessage("Payment saved");
}

async function saveWorkEdit(customerId, workId) {
  let customer = customers.find(c => c.id === customerId);
  if (!customer) return;

  let work = customer.works.find(w => w.id === workId);
  if (!work) return;

  let tool = document.getElementById(`editWorkTool_${workId}`).value;
  let quantity = cleanNumber(document.getElementById(`editWorkQuantity_${workId}`).value);
  let rate = cleanNumber(document.getElementById(`editWorkRate_${workId}`).value);
  let date = document.getElementById(`editWorkDate_${workId}`).value.trim();

  date = normalizeDateForSave(date, work.date || getTodayDate());

  work.landName = document.getElementById(`editWorkField_${workId}`).value.trim();
  work.toolUsed = tool;
  work.cropType = tool === "Thresher" ? document.getElementById(`editWorkCrop_${workId}`).value.trim() : "";
  if (work.cropType === "Herbara") work.cropType = "Chena";
  work.workUnit = getAutoUnit(tool);
  work.quantity = quantity;
  work.rate = rate;
  work.total = Number((quantity * rate).toFixed(2));
  work.date = date;
  work.note = document.getElementById(`editWorkNote_${workId}`).value.trim();

  openedCustomerId = customer.id;
  activeForm.type = "";

  await saveTractorStorage();
  updateAllPages();
  showMessage("Work updated");
}

async function saveDeleteWork(customerId, workId) {
  let customer = customers.find(c => c.id === customerId);
  if (!customer) return;

  customer.works = customer.works.filter(w => w.id !== workId);

  openedCustomerId = customer.id;
  activeForm.type = "";

  await saveTractorStorage();
  updateAllPages();
  showMessage("Work removed");
}

function quickAddWork(customerId) {
  let customer = customers.find(c => c.id === customerId);
  if (!customer) return;

  splitOldName(customer);

  setMode("tractor");
  showPage("addPage", "addBtn");

  document.getElementById("firstName").value = customer.firstName || "";
  document.getElementById("lastName").value = customer.lastName || "";
  document.getElementById("phoneNumber").value = customer.phoneNumber || "";
  document.getElementById("fieldName").value = "";
}

function createDeleteCustomerForm(customer) {
  if (!isActiveForm("deleteCustomer", { customerId: customer.id })) return "";

  return `
    <div class="inline-form">
      <h4>Delete Customer?</h4>
      <p>This will delete all details of <b>${textOrEmpty(getCustomerFullName(customer))}</b>.</p>
      <p>All work records, old due, and payments will be removed.</p>

      <div class="form-actions">
        <button class="delete-btn" onclick="saveDeleteCustomer(${customer.id})">Delete</button>
        <button onclick="closeInlineForm()">Cancel</button>
      </div>
    </div>
  `;
}

async function saveDeleteCustomer(customerId) {
  customers = customers.filter(c => c.id !== customerId);

  if (openedCustomerId === customerId) openedCustomerId = null;
  activeForm.type = "";

  await saveTractorStorage();
  updateAllPages();

  document.getElementById("searchResult").innerHTML = "";
  showMessage("Customer deleted");
}

function buildCustomerShareText(customer) {
  ensureOldDue(customer);

  let lines = [];
  lines.push("Kisan Manager - Customer Details");
  lines.push("Name: " + textOrEmpty(getCustomerFullName(customer)));
  lines.push("Phone: " + textOrEmpty(customer.phoneNumber));
  lines.push("");
  lines.push("Total Amount: ₹" + money(getCustomerTotal(customer)));
  lines.push("Total Paid: ₹" + money(getCustomerPaid(customer)));
  lines.push("Total Balance: ₹" + money(getCustomerBalance(customer)));
  lines.push("");
  lines.push("Old Due Amount: ₹" + money(getOldDueAmount(customer)));
  lines.push("Old Due Paid: ₹" + money(getOldDuePaid(customer)));
  lines.push("Old Due Balance: ₹" + money(getOldDueBalance(customer)));
  lines.push("");
  lines.push("Work History:");

  if (!customer.works || customer.works.length === 0) {
    lines.push("No work added");
  } else {
    customer.works.forEach(function(work, index) {
      lines.push("--------------------");
      lines.push("Work " + (index + 1));
      lines.push("Date: " + textOrEmpty(work.date));
      lines.push("Field: " + textOrEmpty(work.landName));
      lines.push("Tool: " + textOrEmpty(work.toolUsed));
      if (work.toolUsed === "Thresher") {
        lines.push("Crop: " + textOrEmpty(work.cropType));
      }
      lines.push("Work: " + money(work.quantity) + " " + textOrEmpty(work.workUnit));
      lines.push("Rate: ₹" + money(work.rate) + " / " + textOrEmpty(work.workUnit));
      lines.push("Amount: ₹" + money(work.total));
      lines.push("Paid: ₹" + money(getWorkPaid(work)));
      lines.push("Balance: ₹" + money(getWorkBalance(work)));
      lines.push("Note: " + textOrEmpty(work.note));
    });
  }

  return lines.join("\n");
}

async function shareCustomerDetails(customerId) {
  let customer = customers.find(c => c.id === customerId);
  if (!customer) return;

  let text = buildCustomerShareText(customer);

  try {
    if (navigator.share) {
      await navigator.share({
        title: "Kisan Manager - " + getCustomerFullName(customer),
        text: text
      });
      return;
    }

    if (navigator.clipboard) {
      await navigator.clipboard.writeText(text);
      showMessage("Details copied. You can paste and send.");
      return;
    }

    showMessage("Sharing is not supported on this device");
  } catch (error) {
    console.log("Share failed:", error);
  }
}

function refreshSearchIfNeeded() {
  let searchValue = document.getElementById("searchInput").value.trim();
  if (searchValue !== "") searchCustomer();
}

function showAllCustomers() {
  let allCustomers = document.getElementById("allCustomers");
  allCustomers.innerHTML = "";

  mergeDuplicateCustomers();

  if (customers.length === 0) {
    allCustomers.innerHTML = `<p class="empty">No customers added yet</p>`;
    return;
  }

  [...customers].reverse().forEach(function(customer) {
    allCustomers.innerHTML += createCustomerNameOnlyCard(customer);
  });
}

function searchCustomer() {
  let searchValue = document.getElementById("searchInput").value.trim();
  let searchResult = document.getElementById("searchResult");
  let suggestionBox = document.getElementById("customerSuggestions");

  searchResult.innerHTML = "";
  suggestionBox.innerHTML = "";

  if (searchValue === "") {
    showMessage("Enter customer name");
    return;
  }

  let result = customers.filter(function(customer) {
    return customerMatchesSearch(customer, searchValue);
  });

  if (result.length === 0) {
    searchResult.innerHTML = `<p class="empty">No customer found</p>`;
    return;
  }

  result.forEach(function(customer) {
    searchResult.innerHTML += createCustomerNameOnlyCard(customer);
  });
}

function showCustomerSuggestions() {
  let searchValue = document.getElementById("searchInput").value.trim();
  let suggestionBox = document.getElementById("customerSuggestions");

  suggestionBox.innerHTML = "";

  if (searchValue.length < 2) return;

  let result = customers
    .filter(function(customer) {
      return customerMatchesSearch(customer, searchValue);
    })
    .slice(0, 6);

  if (result.length === 0) return;

  let html = `<div class="suggestion-box">`;

  result.forEach(function(customer) {
    html += `
      <div class="suggestion-item" onclick="selectCustomerSuggestion(${customer.id})">
        ${textOrEmpty(getCustomerFullName(customer))}
      </div>
    `;
  });

  html += `</div>`;
  suggestionBox.innerHTML = html;
}

function selectCustomerSuggestion(customerId) {
  let customer = customers.find(function(c) {
    return c.id === customerId;
  });

  if (!customer) return;

  document.getElementById("searchInput").value = getCustomerFullName(customer);
  document.getElementById("customerSuggestions").innerHTML = "";

  openedCustomerId = customer.id;
  searchCustomer();
}

function setCropDayName() {
  let dateInput = document.getElementById("cropDate");
  let dateValue = normalizeDateForSave(dateInput.value.trim(), getTodayDate());
  dateInput.value = dateValue;
  let dayName = getDayNameFromDate(dateValue);
  document.getElementById("cropDayName").value = dayName;
}

async function saveCropDay() {
  let date = document.getElementById("cropDate").value.trim();
  let dayName = document.getElementById("cropDayName").value;
  let note = document.getElementById("cropDayNote").value.trim();

  date = normalizeDateForSave(date, getTodayDate());
  dayName = getDayNameFromDate(date);

  let existingDay = mirchiDays.find(function(day) {
    return day.date === date && (day.cropType || "mirchi") === currentMode;
  });

  if (existingDay) {
    existingDay.dayName = dayName;
    existingDay.note = note || existingDay.note || "";
    openedCropDayId = existingDay.id;
    showMessage("This day already exists. Note updated.");
  } else {
    let newDay = {
      id: generateId(),
      cropType: currentMode,
      date: date,
      dayName: dayName,
      note: note,
      ratePerKg: 0,
      labours: []
    };

    mirchiDays.push(newDay);
    openedCropDayId = newDay.id;

    showMessage(getCropDisplayName(currentMode) + " day card created");
  }

  await saveMirchiStorage();

  clearCropForm();
  updateAllPages();
  showPage("homePage", "homeBtn");
  setMode(currentMode);
}

function clearCropForm() {
  document.getElementById("cropDate").value = getTodayDate();
  setCropDayName();
  document.getElementById("cropDayNote").value = "";
}

function getDayTotalKg(day) {
  let total = 0;

  day.labours.forEach(function(labour) {
    total += cleanNumber(labour.kg);
  });

  return Number(total.toFixed(2));
}

function createCropNameOnlyCard(day) {
  if (openedCropDayId === day.id) return createCropCard(day);

  return `
    <div class="crop-card crop-name-card" onclick="openCropDay(${day.id})">
      <h3>${getCropDisplayName(day.cropType)} - ${textOrEmpty(day.date)}</h3>
      <p><b>Day:</b> ${textOrEmpty(day.dayName)}</p>
    </div>
  `;
}

function openCropDay(dayId) {
  openedCropDayId = openedCropDayId === dayId ? null : dayId;
  activeForm.type = "";
  updateAllPages();

  if (document.getElementById("cropSearchInput").value.trim() !== "") searchCrop();
}

function createCropCard(day) {
  let labourRows = "";
  let wageRows = "";
  let totalKg = getDayTotalKg(day);
  let ratePerKg = cleanNumber(day.ratePerKg);
  let totalWages = 0;

  day.labours.forEach(function(labour, index) {
    let kg = cleanNumber(labour.kg);
    let amount = kg * ratePerKg;
    totalWages += amount;

    labourRows += `
      <tr>
        <td>${index + 1}</td>
        <td>${textOrEmpty(labour.name)}</td>
        <td>${money(kg)} kg</td>
        <td>
          <div class="labour-action-box">
            <button class="edit-btn table-action-btn" onclick="openInlineForm('editLabour', {dayId:${day.id}, labourId:${labour.id}})">Edit</button>
            <button class="delete-x-btn" onclick="openInlineForm('deleteLabour', {dayId:${day.id}, labourId:${labour.id}})">×</button>
          </div>
        </td>
      </tr>
    `;

    if (ratePerKg > 0) {
      wageRows += `
        <tr>
          <td>${index + 1}</td>
          <td>${textOrEmpty(labour.name)}</td>
          <td>${money(kg)} kg</td>
          <td>₹${money(ratePerKg)}</td>
          <td>₹${money(amount)}</td>
        </tr>
      `;
    }
  });

  let collectionTable = "";

  if (day.labours.length === 0) {
    collectionTable = `<p class="empty">No labour added yet</p>`;
  } else {
    collectionTable = `
      <table class="labour-table">
        <thead>
          <tr>
            <th>No</th>
            <th>Labour Name</th>
            <th>Weight</th>
            <th></th>
          </tr>
        </thead>

        <tbody>
          ${labourRows}
        </tbody>
      </table>
    `;
  }

  let wageTable = "";

  if (ratePerKg > 0 && day.labours.length > 0) {
    wageTable = `
      <h4 class="sub-title crop-title">Daily Wages Calculation</h4>

      <table class="labour-table">
        <thead>
          <tr>
            <th>No</th>
            <th>Name</th>
            <th>Kg</th>
            <th>Rate</th>
            <th>Amount</th>
          </tr>
        </thead>

        <tbody>
          ${wageRows}
        </tbody>
      </table>

      <div class="amount-box">
        <div class="amount-line paid">
          <span>Rate Per Kg:</span>
          <span>₹${money(ratePerKg)}</span>
        </div>

        <div class="amount-line balance">
          <span>Total Wages:</span>
          <span>₹${money(totalWages)}</span>
        </div>
      </div>
    `;
  }

  return `
    <div class="crop-card">
      <h3 onclick="openCropDay(${day.id})">${getCropDisplayName(day.cropType)} - ${textOrEmpty(day.date)}</h3>
      <p><b>Day:</b> ${textOrEmpty(day.dayName)}</p>

      <div class="day-note">
        <b>Note:</b> ${textOrEmpty(day.note)}
      </div>

      <h4 class="sub-title crop-title">Labour Weight Table</h4>

      ${collectionTable}

      ${createCropInlineForm(day)}

      ${wageTable}

      <div class="amount-box">
        <div class="amount-line balance">
          <span>Total ${getCropDisplayName(day.cropType)} Weight:</span>
          <span>${money(totalKg)} kg</span>
        </div>

        <div class="amount-line">
          <span>Total Labours:</span>
          <span>${day.labours.length}</span>
        </div>
      </div>

      <div class="actions two-col">
        <button class="add-work-btn" onclick="openInlineForm('addLabour', {dayId:${day.id}})">Add Labour</button>
        <button class="add-pay-btn" onclick="openInlineForm('setRate', {dayId:${day.id}})">Set Rate/Kg</button>
      </div>

      <div class="actions danger-zone">
        <button class="delete-btn" onclick="openInlineForm('deleteCropDay', {dayId:${day.id}})">Delete Full Day Record</button>
      </div>
    </div>
  `;
}

function createCropInlineForm(day) {
  if (isActiveForm("addLabour", { dayId: day.id })) {
    return `
      <div class="inline-form">
        <h4>Add Labour</h4>

        <label>Labour Name</label>
        <input type="text" id="addLabourName_${day.id}">

        <label>Weight in KG</label>
        <input type="text" inputmode="decimal" id="addLabourKg_${day.id}">

        <div class="form-actions">
          <button onclick="saveAddLabour(${day.id})">Save</button>
          <button class="delete-btn" onclick="closeInlineForm()">Cancel</button>
        </div>
      </div>
    `;
  }

  if (isActiveForm("setRate", { dayId: day.id })) {
    return `
      <div class="inline-form">
        <h4>Set Rate Per Kg</h4>

        <label>Rate Per Kg</label>
        <input type="text" inputmode="decimal" id="ratePerKg_${day.id}" value="${day.ratePerKg || ""}">

        <div class="form-actions">
          <button onclick="saveCropRate(${day.id})">Save</button>
          <button class="delete-btn" onclick="closeInlineForm()">Cancel</button>
        </div>
      </div>
    `;
  }

  if (isActiveForm("editLabour", { dayId: day.id })) {
    let labour = day.labours.find(l => l.id === activeForm.labourId);
    if (!labour) return "";

    return `
      <div class="inline-form">
        <h4>Edit Labour</h4>

        <label>Labour Name</label>
        <input type="text" id="editLabourName_${labour.id}" value="${labour.name || ""}">

        <label>Weight in KG</label>
        <input type="text" inputmode="decimal" id="editLabourKg_${labour.id}" value="${labour.kg || ""}">

        <div class="form-actions">
          <button onclick="saveEditLabour(${day.id}, ${labour.id})">Save</button>
          <button class="delete-btn" onclick="closeInlineForm()">Cancel</button>
        </div>
      </div>
    `;
  }

  if (isActiveForm("deleteLabour", { dayId: day.id })) {
    let labour = day.labours.find(l => l.id === activeForm.labourId);
    if (!labour) return "";

    return `
      <div class="inline-form">
        <h4>Delete Labour?</h4>
        <p><b>Name:</b> ${textOrEmpty(labour.name)}</p>
        <p><b>Weight:</b> ${money(labour.kg)} kg</p>

        <div class="form-actions">
          <button class="delete-btn" onclick="saveDeleteLabour(${day.id}, ${labour.id})">Delete</button>
          <button onclick="closeInlineForm()">Cancel</button>
        </div>
      </div>
    `;
  }

  if (isActiveForm("deleteCropDay", { dayId: day.id })) {
    return `
      <div class="inline-form">
        <h4>Delete Day Record?</h4>
        <p><b>Date:</b> ${textOrEmpty(day.date)}</p>
        <p><b>Day:</b> ${textOrEmpty(day.dayName)}</p>

        <div class="form-actions">
          <button class="delete-btn" onclick="saveDeleteCropDay(${day.id})">Delete</button>
          <button onclick="closeInlineForm()">Cancel</button>
        </div>
      </div>
    `;
  }

  return "";
}

async function saveAddLabour(dayId) {
  let day = mirchiDays.find(d => d.id === dayId);
  if (!day) return;

  let name = document.getElementById(`addLabourName_${dayId}`).value.trim();
  let kg = cleanNumber(document.getElementById(`addLabourKg_${dayId}`).value);

  day.labours.push({
    id: generateId(),
    name: name,
    kg: kg
  });

  openedCropDayId = day.id;
  activeForm.type = "";

  await saveMirchiStorage();
  updateAllPages();
  showMessage("Labour added");
}

async function saveCropRate(dayId) {
  let day = mirchiDays.find(d => d.id === dayId);
  if (!day) return;

  day.ratePerKg = cleanNumber(document.getElementById(`ratePerKg_${dayId}`).value);

  openedCropDayId = day.id;
  activeForm.type = "";

  await saveMirchiStorage();
  updateAllPages();
  showMessage("Rate saved");
}

async function saveEditLabour(dayId, labourId) {
  let day = mirchiDays.find(d => d.id === dayId);
  if (!day) return;

  let labour = day.labours.find(l => l.id === labourId);
  if (!labour) return;

  labour.name = document.getElementById(`editLabourName_${labourId}`).value.trim();
  labour.kg = cleanNumber(document.getElementById(`editLabourKg_${labourId}`).value);

  openedCropDayId = day.id;
  activeForm.type = "";

  await saveMirchiStorage();
  updateAllPages();
  showMessage("Labour updated");
}

async function saveDeleteLabour(dayId, labourId) {
  let day = mirchiDays.find(d => d.id === dayId);
  if (!day) return;

  day.labours = day.labours.filter(l => l.id !== labourId);

  openedCropDayId = day.id;
  activeForm.type = "";

  await saveMirchiStorage();
  updateAllPages();
  showMessage("Labour deleted");
}

async function saveDeleteCropDay(dayId) {
  mirchiDays = mirchiDays.filter(day => day.id !== dayId);

  if (openedCropDayId === dayId) openedCropDayId = null;
  activeForm.type = "";

  await saveMirchiStorage();
  updateAllPages();

  document.getElementById("cropSearchResult").innerHTML = "";
  showMessage("Day record deleted");
}

function showAllCropDays() {
  let allCropDays = document.getElementById("allCropDays");
  allCropDays.innerHTML = "";

  if (currentMode === "tractor") return;

  let filteredDays = mirchiDays.filter(function(day) {
    return (day.cropType || "mirchi") === currentMode;
  });

  if (filteredDays.length === 0) {
    allCropDays.innerHTML = `<p class="empty">No ${getCropDisplayName(currentMode)} weight added yet</p>`;
    return;
  }

  [...filteredDays].reverse().forEach(function(day) {
    allCropDays.innerHTML += createCropNameOnlyCard(day);
  });
}

function searchCrop() {
  let searchValue = document.getElementById("cropSearchInput").value.trim().toLowerCase();
  let resultBox = document.getElementById("cropSearchResult");

  resultBox.innerHTML = "";

  if (searchValue === "") {
    showMessage("Enter date or labour name");
    return;
  }

  let result = mirchiDays.filter(function(day) {
    if ((day.cropType || "mirchi") !== currentMode) return false;

    let dateMatch = day.date.includes(searchValue);
    let dayMatch = String(day.dayName || "").toLowerCase().includes(searchValue);
    let noteMatch = String(day.note || "").toLowerCase().includes(searchValue);
    let labourMatch = day.labours.some(function(labour) {
      return String(labour.name || "").toLowerCase().includes(searchValue);
    });

    return dateMatch || dayMatch || noteMatch || labourMatch;
  });

  if (result.length === 0) {
    resultBox.innerHTML = `<p class="empty">No ${getCropDisplayName(currentMode)} record found</p>`;
    return;
  }

  result.forEach(function(day) {
    resultBox.innerHTML += createCropNameOnlyCard(day);
  });
}

function getCropReportRate() {
  return cleanNumber(localStorage.getItem("kisan_report_rate_" + currentMode));
}

function createReportRateForm() {
  if (activeForm.type !== "reportRate") {
    return "";
  }

  return `
    <div class="inline-form">
      <h4>Set Report Rate Per Kg</h4>

      <label>Rate Per Kg</label>
      <input type="text" inputmode="decimal" id="reportRateInput" value="${getCropReportRate() || ""}">

      <div class="form-actions">
        <button onclick="saveCropReportRate()">Save</button>
        <button class="delete-btn" onclick="closeInlineForm()">Cancel</button>
      </div>
    </div>
  `;
}

function saveCropReportRate() {
  let rate = cleanNumber(document.getElementById("reportRateInput").value);
  localStorage.setItem("kisan_report_rate_" + currentMode, String(rate));
  activeForm.type = "";
  updateAllPages();
  showMessage("Report rate saved");
}

function getLabourSummaryHTML(filteredDays, reportRate) {
  let summary = {};

  filteredDays.forEach(function(day) {
    let countedOnDate = {};

    day.labours.forEach(function(labour) {
      let name = String(labour.name || "Not added").trim() || "Not added";
      let key = normalizeName(name);

      if (!summary[key]) {
        summary[key] = {
          name: name,
          days: 0,
          weight: 0
        };
      }

      summary[key].weight += cleanNumber(labour.kg);

      if (!countedOnDate[key]) {
        summary[key].days += 1;
        countedOnDate[key] = true;
      }
    });
  });

  let rows = Object.values(summary).sort(function(a, b) {
    return a.name.localeCompare(b.name);
  });

  if (rows.length === 0) {
    return `<p class="empty">No labour data found</p>`;
  }

  let rowHTML = "";
  let totalWeight = 0;
  let totalAmount = 0;

  rows.forEach(function(item, index) {
    let amount = cleanNumber(item.weight) * cleanNumber(reportRate);
    totalWeight += cleanNumber(item.weight);
    totalAmount += amount;

    rowHTML += `
      <tr>
        <td>${index + 1}</td>
        <td>${textOrEmpty(item.name)}</td>
        <td>${item.days}</td>
        <td>${money(item.weight)} kg</td>
        <td>₹${money(amount)}</td>
      </tr>
    `;
  });

  return `
    <h4 class="sub-title crop-title">Labour Weight Report</h4>

    <table class="labour-table">
      <thead>
        <tr>
          <th>No</th>
          <th>Name</th>
          <th>Days</th>
          <th>Weight</th>
          <th>Amount</th>
        </tr>
      </thead>
      <tbody>${rowHTML}</tbody>
    </table>

    <div class="amount-box">
      <div class="amount-line balance">
        <span>Total Weight:</span>
        <span>${money(totalWeight)} kg</span>
      </div>
      <div class="amount-line paid">
        <span>Report Rate/Kg:</span>
        <span>₹${money(reportRate)}</span>
      </div>
      <div class="amount-line paid">
        <span>Total Amount:</span>
        <span>₹${money(totalAmount)}</span>
      </div>
    </div>
  `;
}

function showReport() {
  let reportBox = document.getElementById("reportBox");

  if (currentMode === "tractor") {
    let totalAmount = 0;
    let totalPaid = 0;
    let totalBalance = 0;
    let totalCustomers = customers.length;
    let totalWorks = 0;
    let totalOldDue = 0;
    let totalOldDueBalance = 0;

    customers.forEach(function(customer) {
      totalAmount += getCustomerTotal(customer);
      totalPaid += getCustomerPaid(customer);
      totalBalance += getCustomerBalance(customer);
      totalWorks += customer.works.length;
      totalOldDue += getOldDueAmount(customer);
      totalOldDueBalance += getOldDueBalance(customer);
    });

    reportBox.innerHTML = `
      <div class="amount-box">
        <div class="amount-line">
          <span>Total Customers:</span>
          <span>${totalCustomers}</span>
        </div>

        <div class="amount-line">
          <span>Total Work Records:</span>
          <span>${totalWorks}</span>
        </div>

        <div class="amount-line">
          <span>Total Old Due:</span>
          <span>₹${money(totalOldDue)}</span>
        </div>

        <div class="amount-line balance">
          <span>Old Due Balance:</span>
          <span>₹${money(totalOldDueBalance)}</span>
        </div>

        <div class="amount-line">
          <span>Total Amount:</span>
          <span>₹${money(totalAmount)}</span>
        </div>

        <div class="amount-line paid">
          <span>Total Paid:</span>
          <span>₹${money(totalPaid)}</span>
        </div>

        <div class="amount-line balance">
          <span>Total Balance:</span>
          <span>₹${money(totalBalance)}</span>
        </div>
      </div>
    `;
  } else {
    let totalKg = 0;
    let totalDays = 0;
    let totalLabourEntries = 0;

    let filteredDays = mirchiDays.filter(function(day) {
      return (day.cropType || "mirchi") === currentMode;
    });

    filteredDays.forEach(function(day) {
      totalDays++;
      totalKg += getDayTotalKg(day);
      totalLabourEntries += day.labours.length;
    });

    let reportRate = getCropReportRate();
    let reportTotalAmount = totalKg * reportRate;

    reportBox.innerHTML = `
      <div class="amount-box">
        <div class="amount-line">
          <span>Total Days:</span>
          <span>${totalDays}</span>
        </div>

        <div class="amount-line">
          <span>Total Labour Entries:</span>
          <span>${totalLabourEntries}</span>
        </div>

        <div class="amount-line balance">
          <span>Total ${getCropDisplayName(currentMode)} Weight:</span>
          <span>${money(totalKg)} kg</span>
        </div>

        <div class="amount-line paid">
          <span>Report Rate/Kg:</span>
          <span>₹${money(reportRate)}</span>
        </div>

        <div class="amount-line paid">
          <span>Total Amount:</span>
          <span>₹${money(reportTotalAmount)}</span>
        </div>
      </div>

      <div class="actions">
        <button class="add-pay-btn" onclick="openInlineForm('reportRate', {})">Set Report Rate/Kg</button>
      </div>

      ${createReportRateForm()}

      ${getLabourSummaryHTML(filteredDays, reportRate)}
    `;
  }
}


function showPage(pageId, buttonId) {
  activeForm.type = "";

  document.getElementById("homePage").classList.add("hidden");
  document.getElementById("addPage").classList.add("hidden");
  document.getElementById("reportPage").classList.add("hidden");

  document.getElementById(pageId).classList.remove("hidden");

  document.getElementById("homeBtn").classList.remove("active");
  document.getElementById("addBtn").classList.remove("active");
  document.getElementById("reportBtn").classList.remove("active");

  document.getElementById(buttonId).classList.add("active");

  updateAllPages();
}

function updateAllPages() {
  migrateOldData();
  mergeDuplicateCustomers();
  showAllCustomers();
  showAllCropDays();
  showReport();
}

async function startApp() {
  showMainAppFromLocalSession();
  showLoginIfNoAuthAfterDelay();

  try {
    await openKisanDB();

    customers = await getAllCustomersDB();
    mirchiDays = await getAllMirchiDaysDB();

    document.getElementById("workDate").value = getTodayDate();
    document.getElementById("cropDate").value = getTodayDate();

    migrateOldData();
    setCropDayName();
    handleToolChange();
    setMode("tractor");
    updateAllPages();

    if (window.syncNow) window.syncNow();
  } catch (error) {
    showMessage("Database failed to open");
    console.log(error);
  }
}

startApp();