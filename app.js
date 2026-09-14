// =========================================
// SUPABASE CONFIGURATION
// =========================================

const SUPABASE_URL = "https://mxxmhlkmjndrzpfgtiay.supabase.co";
const SUPABASE_KEY = "sb_publishable_qOsBWh1PK3SXb2-AqAhH8A_XJ5GL4XA";

const supabase = window.supabase.createClient(
    SUPABASE_URL,
    SUPABASE_KEY
);


// =========================================
// GENERAL SECTION FUNCTIONS
// =========================================

function hideAllSections() {
    document.querySelectorAll(".section").forEach(section => {
        section.style.display = "none";
    });
}

function showLogin() {
    hideAllSections();
    document.getElementById("loginSection").style.display = "block";
}

function showSignup() {
    hideAllSections();
    document.getElementById("signupSection").style.display = "block";
}

function showForgotPassword() {
    hideAllSections();
    document.getElementById("forgotPasswordSection").style.display = "block";
}


// =========================================
// LOGIN
// =========================================

async function login() {

    const email = document.getElementById("loginEmail").value.trim();
    const password = document.getElementById("loginPassword").value;

    const message = document.getElementById("loginMessage");

    message.textContent = "";

    if (!email || !password) {
        message.textContent = "Please enter email and password.";
        return;
    }

    const { data, error } = await supabase.auth.signInWithPassword({
        email: email,
        password: password
    });

    if (error) {
        message.textContent = error.message;
        return;
    }

    const user = data.user;

    if (!user) {
        message.textContent = "Login failed.";
        return;
    }

    // Get profile
    const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("name, role")
        .eq("id", user.id)
        .single();

    if (profileError) {
        message.textContent = "Profile not found.";
        return;
    }

    hideAllSections();

    // =========================================
    // ADMIN LOGIN
    // =========================================

    if (profile.role === "admin") {

        document.getElementById("adminDashboard").style.display = "block";

        const attendanceDate =
            document.getElementById("attendanceDate");

        if (attendanceDate) {
            attendanceDate.value = getLocalDateString();
        }

        await loadAdminStudentsForDate();
        await loadAdminAttendance();

        return;
    }


    // =========================================
    // STUDENT LOGIN
    // =========================================

    document.getElementById("studentDashboard").style.display = "block";

    const welcome = document.getElementById("studentWelcome");

    if (welcome) {
        welcome.textContent =
            `Welcome, ${profile.name || "Student"}!`;
    }

    await loadMyAttendance();
}


// =========================================
// SIGN UP
// =========================================

async function signup() {

    const name =
        document.getElementById("signupName").value.trim();

    const phone =
        document.getElementById("signupPhone").value.trim();

    const email =
        document.getElementById("signupEmail").value.trim();

    const password =
        document.getElementById("signupPassword").value;

    const message =
        document.getElementById("signupMessage");

    message.textContent = "";

    if (!name || !phone || !email || !password) {
        message.textContent = "Please fill all fields.";
        return;
    }

    const { error } = await supabase.auth.signUp({

        email: email,

        password: password,

        options: {
            data: {
                name: name,
                phone: phone
            },

            emailRedirectTo:
                window.location.origin +
                window.location.pathname
        }
    });

    if (error) {
        message.textContent = error.message;
        return;
    }

    message.textContent =
        "Account created successfully. Please check your email if verification is required.";
}


// =========================================
// PASSWORD RECOVERY
// =========================================

async function sendPasswordRecovery() {

    const email =
        document.getElementById("forgotEmail").value.trim();

    const message =
        document.getElementById("forgotMessage");

    message.textContent = "";

    if (!email) {
        message.textContent = "Please enter your email.";
        return;
    }

    const { error } =
        await supabase.auth.resetPasswordForEmail(email, {

            redirectTo:
                window.location.origin +
                window.location.pathname
        });

    if (error) {
        message.textContent = error.message;
        return;
    }

    message.textContent =
        "Password reset link sent to your email.";
}


// =========================================
// UPDATE PASSWORD
// =========================================

async function updatePassword() {

    const password =
        document.getElementById("newPassword").value;

    const message =
        document.getElementById("resetPasswordMessage");

    message.textContent = "";

    if (!password) {
        message.textContent = "Please enter a new password.";
        return;
    }

    const { error } =
        await supabase.auth.updateUser({
            password: password
        });

    if (error) {
        message.textContent = error.message;
        return;
    }

    message.textContent =
        "Password updated successfully.";

    setTimeout(() => {
        showLogin();
    }, 1500);
}


// =========================================
// AUTH STATE
// =========================================

supabase.auth.onAuthStateChange((event, session) => {

    console.log("Auth event:", event);

    if (event === "PASSWORD_RECOVERY") {

        hideAllSections();

        const resetSection =
            document.getElementById("resetPasswordSection");

        if (resetSection) {
            resetSection.style.display = "block";
        }
    }
});


// =========================================
// LOGOUT
// =========================================

async function logout() {

    await supabase.auth.signOut();

    hideAllSections();

    document.getElementById("loginSection").style.display =
        "block";
}


// =========================================
// LOCAL DATE
// =========================================

function getLocalDateString(date = new Date()) {

    const year = date.getFullYear();

    const month =
        String(date.getMonth() + 1).padStart(2, "0");

    const day =
        String(date.getDate()).padStart(2, "0");

    return `${year}-${month}-${day}`;
}


// =========================================
// GET DATE OFFSET
// =========================================

function getDateOffset(days) {

    const date = new Date();

    date.setDate(date.getDate() + days);

    return getLocalDateString(date);
}


// =========================================
// ADMIN - LOAD STUDENTS
// =========================================

async function loadAdminStudentsForDate() {

    const dateInput =
        document.getElementById("attendanceDate");

    const studentList =
        document.getElementById("studentList");

    if (!dateInput || !studentList) return;

    const date = dateInput.value;

    if (!date) return;

    studentList.innerHTML = "Loading...";

    const { data: students, error } =
        await supabase
            .from("profiles")
            .select("id, name, email, phone")
            .eq("role", "student")
            .order("name");

    if (error) {

        studentList.innerHTML =
            "Error loading students.";

        console.error(error);

        return;
    }

    const { data: attendance, error: attendanceError } =
        await supabase
            .from("Attendance")
            .select("user_id, present")
            .eq("attendance_date", date);

    if (attendanceError) {

        studentList.innerHTML =
            "Error loading attendance.";

        console.error(attendanceError);

        return;
    }

    const attendanceMap = {};

    attendance.forEach(record => {
        attendanceMap[record.user_id] = record.present;
    });

    if (!students || students.length === 0) {

        studentList.innerHTML =
            "No students found.";

        return;
    }

    studentList.innerHTML = "";

    students.forEach(student => {

        const row = document.createElement("div");

        row.className = "student-row";

        const checked =
            attendanceMap[student.id] === true
                ? "checked"
                : "";

        row.innerHTML = `
            <label>
                <input
                    type="checkbox"
                    class="admin-attendance-checkbox"
                    data-user-id="${student.id}"
                    ${checked}
                >
                ${student.name || "Unnamed Student"}
            </label>
        `;

        studentList.appendChild(row);
    });
}


// =========================================
// ADMIN - SAVE ATTENDANCE
// =========================================

async function saveAttendance() {

    const dateInput =
        document.getElementById("attendanceDate");

    const message =
        document.getElementById("attendanceMessage");

    const date = dateInput.value;

    if (!date) {

        message.textContent =
            "Please select a date.";

        return;
    }

    const checkboxes =
        document.querySelectorAll(
            ".admin-attendance-checkbox"
        );

    if (!checkboxes.length) {

        message.textContent =
            "No students available.";

        return;
    }

    message.textContent =
        "Saving attendance...";

    for (const checkbox of checkboxes) {

        const userId =
            checkbox.dataset.userId;

        const present =
            checkbox.checked;

        const { data: existing, error: checkError } =
            await supabase
                .from("Attendance")
                .select("id")
                .eq("user_id", userId)
                .eq("attendance_date", date)
                .limit(1);

        if (checkError) {

            console.error(checkError);

            continue;
        }

        if (existing && existing.length > 0) {

            const { error } =
                await supabase
                    .from("Attendance")
                    .update({
                        present: present
                    })
                    .eq("id", existing[0].id);

            if (error) {
                console.error(error);
            }

        } else {

            const { error } =
                await supabase
                    .from("Attendance")
                    .insert({
                        user_id: userId,
                        attendance_date: date,
                        present: present
                    });

            if (error) {
                console.error(error);
            }
        }
    }

    message.textContent =
        "Attendance saved successfully.";

    await loadAdminAttendance();
}


// =========================================
// ADMIN - ATTENDANCE HISTORY
// =========================================

async function loadAdminAttendance() {

    const history =
        document.getElementById("adminAttendanceHistory");

    if (!history) return;

    history.innerHTML = "Loading...";

    const { data, error } =
        await supabase
            .from("Attendance")
            .select("user_id, attendance_date, present")
            .order("attendance_date", {
                ascending: false
            });

    if (error) {

        history.innerHTML =
            "Error loading attendance.";

        console.error(error);

        return;
    }

    if (!data || data.length === 0) {

        history.innerHTML =
            "No attendance records found.";

        return;
    }

    history.innerHTML = "";

    data.forEach(record => {

        const row = document.createElement("div");

        row.className = "attendance-history-row";

        row.textContent =
            `${record.attendance_date} - ${record.present ? "Present" : "Absent"}`;

        history.appendChild(row);
    });
}


// =========================================
// ADMIN - ABSENTEES
// =========================================

async function loadAdminAbsentees(date) {

    const list =
        document.getElementById("adminAbsenteesList");

    if (!list) return;

    list.innerHTML = "Loading...";

    const { data: students, error: studentsError } =
        await supabase
            .from("profiles")
            .select("id, name")
            .eq("role", "student");

    if (studentsError) {

        list.innerHTML =
            "Error loading students.";

        return;
    }

    const { data: attendance, error: attendanceError } =
        await supabase
            .from("Attendance")
            .select("user_id, present")
            .eq("attendance_date", date);

    if (attendanceError) {

        list.innerHTML =
            "Error loading attendance.";

        return;
    }

    const attendanceMap = {};

    attendance.forEach(record => {
        attendanceMap[record.user_id] = record.present;
    });

    const absentees =
        students.filter(student =>
            attendanceMap[student.id] !== true
        );

    if (absentees.length === 0) {

        list.innerHTML =
            "No absentees.";

        return;
    }

    list.innerHTML = "";

    absentees.forEach(student => {

        const row =
            document.createElement("div");

        row.textContent =
            student.name || "Unnamed Student";

        list.appendChild(row);
    });
}


// =========================================
// STUDENT - CHECK SELECTED DATE
// =========================================

async function checkSelectedAttendanceDate() {

    const dateInput =
        document.getElementById("studentAttendanceDate");

    const status =
        document.getElementById("todayAttendanceStatus");

    const presentButton =
        document.getElementById("studentPresentButton");

    const absentButton =
        document.getElementById("studentAbsentButton");

    const message =
        document.getElementById("studentAttendanceMessage");

    if (!dateInput) return;

    const selectedDate =
        dateInput.value;

    const today =
        getLocalDateString();

    const yesterday =
        getDateOffset(-1);

    const dayBeforeYesterday =
        getDateOffset(-2);

    const allowedDates = [
        today,
        yesterday,
        dayBeforeYesterday
    ];

    // Reset
    presentButton.disabled = false;
    absentButton.disabled = false;

    message.textContent = "";

    if (!selectedDate) {

        status.textContent =
            "Please select a date.";

        presentButton.disabled = true;
        absentButton.disabled = true;

        return;
    }

    // Older or future dates
    if (!allowedDates.includes(selectedDate)) {

        if (selectedDate > today) {

            status.textContent =
                "Future dates are not available.";

        } else {

            status.textContent =
                "Attendance can only be entered for today, yesterday, or the day before yesterday.";
        }

        presentButton.disabled = true;
        absentButton.disabled = true;

        return;
    }

    // Get current user
    const {
        data: { user },
        error: userError
    } = await supabase.auth.getUser();

    if (userError || !user) {

        status.textContent =
            "Please login again.";

        presentButton.disabled = true;
        absentButton.disabled = true;

        return;
    }

    // Check whether attendance already exists
    const { data: existing, error } =
        await supabase
            .from("Attendance")
            .select("id, present")
            .eq("user_id", user.id)
            .eq("attendance_date", selectedDate)
            .limit(1);

    if (error) {

        console.error(error);

        status.textContent =
            "Unable to check attendance.";

        presentButton.disabled = true;
        absentButton.disabled = true;

        return;
    }

    if (existing && existing.length > 0) {

        const record = existing[0];

        status.textContent =
            record.present
                ? "Present ✓"
                : "Absent ✕";

        message.textContent =
            "Attendance already submitted. This record is locked and cannot be changed.";

        // LOCK BUTTONS
        presentButton.disabled = true;
        absentButton.disabled = true;

        return;
    }

    status.textContent =
        "Not submitted yet.";

    message.textContent =
        "You can submit attendance for this date.";

    presentButton.disabled = false;
    absentButton.disabled = false;
}


// =========================================
// STUDENT - SUBMIT ATTENDANCE
// =========================================

async function setMyAttendance(present) {

    const dateInput =
        document.getElementById("studentAttendanceDate");

    const status =
        document.getElementById("todayAttendanceStatus");

    const message =
        document.getElementById("studentAttendanceMessage");

    const presentButton =
        document.getElementById("studentPresentButton");

    const absentButton =
        document.getElementById("studentAbsentButton");

    if (!dateInput) return;

    const selectedDate =
        dateInput.value;

    const today =
        getLocalDateString();

    const yesterday =
        getDateOffset(-1);

    const dayBeforeYesterday =
        getDateOffset(-2);

    const allowedDates = [
        today,
        yesterday,
        dayBeforeYesterday
    ];

    // Check date
    if (!allowedDates.includes(selectedDate)) {

        message.textContent =
            "You can only submit attendance for today, yesterday, or the day before yesterday.";

        return;
    }

    // Get logged-in user
    const {
        data: { user },
        error: userError
    } = await supabase.auth.getUser();

    if (userError || !user) {

        message.textContent =
            "Please login again.";

        return;
    }

    message.textContent =
        "Submitting attendance...";

    // IMPORTANT:
    // We NEVER UPDATE an existing student record.
    // If a record exists, it remains locked.

    const { data: existing, error: checkError } =
        await supabase
            .from("Attendance")
            .select("id, present")
            .eq("user_id", user.id)
            .eq("attendance_date", selectedDate)
            .limit(1);

    if (checkError) {

        console.error(checkError);

        message.textContent =
            "Unable to check existing attendance.";

        return;
    }

    if (existing && existing.length > 0) {

        const record = existing[0];

        status.textContent =
            record.present
                ? "Present ✓"
                : "Absent ✕";

        message.textContent =
            "Attendance was already submitted and is locked.";

        presentButton.disabled = true;
        absentButton.disabled = true;

        await loadMyAttendance();

        return;
    }

    // Insert new attendance
    const { error: insertError } =
        await supabase
            .from("Attendance")
            .insert({
                user_id: user.id,
                attendance_date: selectedDate,
                present: present
            });

    if (insertError) {

        console.error(insertError);

        message.textContent =
            insertError.message;

        return;
    }

    status.textContent =
        present
            ? "Present ✓"
            : "Absent ✕";

    message.textContent =
        "Attendance submitted successfully. This record is now locked.";

    // LOCK BUTTONS IMMEDIATELY
    presentButton.disabled = true;
    absentButton.disabled = true;

    // Reload everything
    await loadMyAttendance();
}


// =========================================
// STUDENT - LOAD ATTENDANCE
// =========================================

async function loadMyAttendance() {

    const dateInput =
        document.getElementById("studentAttendanceDate");

    const history =
        document.getElementById("attendanceHistory");

    const percentage =
        document.getElementById("attendancePercentage");

    const totalDays =
        document.getElementById("totalDays");

    const presentDays =
        document.getElementById("presentDays");

    const absentDays =
        document.getElementById("absentDays");

    if (!dateInput) return;

    const today =
        getLocalDateString();

    const minimumDate =
        getDateOffset(-2);

    // Date picker restrictions
    dateInput.min = minimumDate;
    dateInput.max = today;

    // If no date selected, use today
    if (!dateInput.value) {
        dateInput.value = today;
    }

    const {
        data: { user },
        error: userError
    } = await supabase.auth.getUser();

    if (userError || !user) {
        return;
    }

    // =========================================
    // LOAD ALL USER ATTENDANCE
    // =========================================

    const { data, error } =
        await supabase
            .from("Attendance")
            .select("id, attendance_date, present")
            .eq("user_id", user.id)
            .order("attendance_date", {
                ascending: false
            });

    if (error) {

        console.error(error);

        if (history) {
            history.innerHTML =
                "Error loading attendance.";
        }

        return;
    }

    const records = data || [];

    const attendanceMap = {};

    records.forEach(record => {

        // Keep the first record if duplicates somehow exist
        if (!attendanceMap[record.attendance_date]) {
            attendanceMap[record.attendance_date] = record;
        }
    });


    // =========================================
    // MONTHLY SUMMARY
    // =========================================

    const now = new Date();

    const currentYear =
        now.getFullYear();

    const currentMonth =
        now.getMonth();

    const monthRecords =
        records.filter(record => {

            const date =
                new Date(record.attendance_date + "T00:00:00");

            return (
                date.getFullYear() === currentYear &&
                date.getMonth() === currentMonth
            );
        });

    const totalRecorded =
        monthRecords.length;

    const presentCount =
        monthRecords.filter(
            record => record.present === true
        ).length;

    const absentCount =
        monthRecords.filter(
            record => record.present === false
        ).length;

    const attendancePercentageValue =
        totalRecorded > 0
            ? Math.round(
                (presentCount / totalRecorded) * 100
            )
            : 0;

    if (percentage) {
        percentage.textContent =
            `${attendancePercentageValue}%`;
    }

    if (totalDays) {
        totalDays.textContent =
            totalRecorded;
    }

    if (presentDays) {
        presentDays.textContent =
            presentCount;
    }

    if (absentDays) {
        absentDays.textContent =
            absentCount;
    }


    // =========================================
    // WHOLE CURRENT MONTH
    // =========================================

    if (history) {

        history.innerHTML = "";

        const firstDay =
            new Date(
                currentYear,
                currentMonth,
                1
            );

        const lastDay =
            new Date(
                currentYear,
                currentMonth + 1,
                0
            );

        const monthTitle =
            document.createElement("h3");

        monthTitle.textContent =
            firstDay.toLocaleString(
                "en-US",
                {
                    month: "long",
                    year: "numeric"
                }
            );

        history.appendChild(monthTitle);


        for (
            let day = 1;
            day <= lastDay.getDate();
            day++
        ) {

            const date =
                new Date(
                    currentYear,
                    currentMonth,
                    day
                );

            const dateString =
                getLocalDateString(date);

            const record =
                attendanceMap[dateString];

            const row =
                document.createElement("div");

            row.className =
                "student-month-row";

            const dateText =
                date.toLocaleDateString(
                    "en-IN",
                    {
                        weekday: "short",
                        day: "2-digit",
                        month: "short",
                        year: "numeric"
                    }
                );

            let statusText = "";

            if (dateString > today) {

                statusText =
                    "— Future";

            } else if (record) {

                statusText =
                    record.present
                        ? "✓ Present 🔒"
                        : "✕ Absent 🔒";

            } else {

                const dateDifference =
                    Math.round(
                        (
                            new Date(today + "T00:00:00") -
                            new Date(dateString + "T00:00:00")
                        ) / (1000 * 60 * 60 * 24)
                    );

                if (dateDifference >= 0 &&
                    dateDifference <= 2) {

                    statusText =
                        "— Available to enter";

                } else {

                    statusText =
                        "— Not submitted 🔒";
                }
            }

            row.innerHTML = `
                <span>${dateText}</span>
                <span>${statusText}</span>
            `;

            history.appendChild(row);
        }
    }


    // =========================================
    // UPDATE SELECTED DATE STATUS
    // =========================================

    await checkSelectedAttendanceDate();
}


// =========================================
// PAGE LOAD
// =========================================

document.addEventListener(
    "DOMContentLoaded",
    () => {

        console.log(
            "Mission Fajr loaded successfully."
        );

    }
);
