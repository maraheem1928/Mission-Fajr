// =========================================
// SUPABASE CONFIGURATION
// =========================================

const SUPABASE_URL = "https://mxxmhlkmjndrzpfgtiay.supabase.co";

const SUPABASE_KEY =
    "sb_publishable_qOsBWh1PK3SXb2-AqAhH8A_XJ5GL4XA";

const supabase = window.supabase.createClient(
    SUPABASE_URL,
    SUPABASE_KEY,
    {
        auth: {
            persistSession: true,
            autoRefreshToken: true,
            detectSessionInUrl: true
        }
    }
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

    const section = document.getElementById("loginSection");

    if (section) {
        section.style.display = "block";
    }
}


function showSignup() {
    hideAllSections();

    const section = document.getElementById("signupSection");

    if (section) {
        section.style.display = "block";
    }
}


function showForgotPassword() {
    hideAllSections();

    const section = document.getElementById("forgotPasswordSection");

    if (section) {
        section.style.display = "block";
    }
}


// =========================================
// GET LOCAL DATE
// =========================================

function getLocalDateString(date = new Date()) {

    const year = date.getFullYear();

    const month = String(
        date.getMonth() + 1
    ).padStart(2, "0");

    const day = String(
        date.getDate()
    ).padStart(2, "0");

    return `${year}-${month}-${day}`;
}


// =========================================
// GET DATE OFFSET
// =========================================

function getDateOffset(days) {

    const date = new Date();

    date.setDate(
        date.getDate() + days
    );

    return getLocalDateString(date);
}
// =========================================
// LOGIN
// =========================================

async function login() {

    const loginInput =
        document.getElementById("loginEmail");

    const passwordInput =
        document.getElementById("loginPassword");

    const message =
        document.getElementById("loginMessage");

    const loginValue =
        loginInput ? loginInput.value.trim() : "";

    const password =
        passwordInput ? passwordInput.value : "";

    if (message) {
        message.textContent = "";
    }

    if (!loginValue) {
        message.textContent =
            "Please enter your mobile number or email.";
        return;
    }

    if (!password) {
        message.textContent =
            "Please enter your password.";
        return;
    }

    message.textContent = "Logging in...";

    try {

        // =====================================
        // EMAIL LOGIN
        // =====================================

        if (loginValue.includes("@")) {

            const {
                data,
                error
            } = await supabase.auth.signInWithPassword({
                email: loginValue,
                password: password
            });

            if (error) {

                console.error(
                    "Email login error:",
                    error
                );

                message.textContent =
                    "Invalid email or password.";

                return;
            }

            if (!data?.session) {

                message.textContent =
                    "Login failed. No session received.";

                return;
            }

            await openUserDashboard(
                data.session
            );

            return;
        }


        // =====================================
        // MOBILE NUMBER LOGIN
        // =====================================

        const {
            data,
            error
        } = await supabase.functions.invoke(
            "swift-endpoint",
            {
                body: {
                    phone: loginValue,
                    password: password
                }
            }
        );

        if (error) {

            console.error(
                "Phone login error:",
                error
            );

            message.textContent =
                "Invalid mobile number or password.";

            return;
        }

        console.log(
            "Phone login response:",
            data
        );

        const sessionData =
            data?.session || data;

        if (
            !sessionData?.access_token ||
            !sessionData?.refresh_token
        ) {

            console.error(
                "Invalid login response:",
                data
            );

            message.textContent =
                "Login failed. Invalid server response.";

            return;
        }

        const {
            data: sessionResult,
            error: sessionError
        } = await supabase.auth.setSession({

            access_token:
                sessionData.access_token,

            refresh_token:
                sessionData.refresh_token

        });

        if (sessionError) {

            console.error(
                "Session error:",
                sessionError
            );

            message.textContent =
                "Unable to create login session.";

            return;
        }

        if (!sessionResult?.session) {

            message.textContent =
                "Login failed.";

            return;
        }

        await openUserDashboard(
            sessionResult.session
        );

    } catch (err) {

        console.error(
            "Login exception:",
            err
        );

        message.textContent =
            "Unable to login. Please try again.";
    }
}


// =========================================
// LOGIN WITH ENTER KEY
// =========================================

document.addEventListener(
    "DOMContentLoaded",
    () => {

        const loginPassword =
            document.getElementById(
                "loginPassword"
            );

        if (loginPassword) {

            loginPassword.addEventListener(
                "keydown",
                event => {

                    if (event.key === "Enter") {

                        event.preventDefault();

                        login();

                    }

                }
            );

        }

    }
);

// =========================================
// OPEN USER DASHBOARD
// =========================================

async function openUserDashboard(session) {

    if (!session?.user) {
        showLogin();
        return;
    }


    const message =
        document.getElementById("loginMessage");


    const {
        data: profile,
        error: profileError
    } = await supabase
        .from("profiles")
        .select("name, role")
        .eq("id", session.user.id)
        .single();


    if (profileError) {

        console.error(
            "Profile error:",
            profileError
        );

        if (message) {
            message.textContent =
                "Profile not found.";
        }

        return;
    }


    hideAllSections();


    // =========================================
    // ADMIN
    // =========================================

    if (profile.role === "admin") {

        const dashboard =
            document.getElementById(
                "adminDashboard"
            );

        if (dashboard) {
            dashboard.style.display = "block";
        }


        const attendanceDate =
            document.getElementById(
                "attendanceDate"
            );


        if (attendanceDate) {

            attendanceDate.value =
                getLocalDateString();

        }


        await loadAdminStudentsForDate();

        await loadAdminAttendance();

        return;
    }


    // =========================================
    // STUDENT
    // =========================================

    const dashboard =
        document.getElementById(
            "studentDashboard"
        );

    if (dashboard) {
        dashboard.style.display = "block";
    }


    const welcome =
        document.getElementById(
            "studentWelcome"
        );


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
        document.getElementById(
            "signupName"
        ).value.trim();

    const phone =
        document.getElementById(
            "signupPhone"
        ).value.trim();

    const email =
        document.getElementById(
            "signupEmail"
        ).value.trim();

    const password =
        document.getElementById(
            "signupPassword"
        ).value;

    const message =
        document.getElementById(
            "signupMessage"
        );


    message.textContent = "";


    if (
        !name ||
        !phone ||
        !email ||
        !password
    ) {

        message.textContent =
            "Please fill all fields.";

        return;
    }


    const { error } =
        await supabase.auth.signUp({

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

        console.error(error);

        message.textContent =
            error.message;

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
        document.getElementById(
            "forgotEmail"
        ).value.trim();

    const message =
        document.getElementById(
            "forgotMessage"
        );


    message.textContent = "";


    if (!email) {

        message.textContent =
            "Please enter your email.";

        return;
    }


    const { error } =
        await supabase.auth.resetPasswordForEmail(
            email,
            {
                redirectTo:
                    window.location.origin +
                    window.location.pathname
            }
        );


    if (error) {

        console.error(error);

        message.textContent =
            error.message;

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
        document.getElementById(
            "newPassword"
        ).value;

    const message =
        document.getElementById(
            "resetPasswordMessage"
        );


    message.textContent = "";


    if (!password) {

        message.textContent =
            "Please enter a new password.";

        return;
    }


    const { error } =
        await supabase.auth.updateUser({

            password: password

        });


    if (error) {

        console.error(error);

        message.textContent =
            error.message;

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

supabase.auth.onAuthStateChange(
    (event, session) => {

        console.log(
            "Auth event:",
            event
        );


        if (
            event === "PASSWORD_RECOVERY"
        ) {

            hideAllSections();

            const resetSection =
                document.getElementById(
                    "resetPasswordSection"
                );

            if (resetSection) {

                resetSection.style.display =
                    "block";

            }

            return;
        }


        if (
            event === "SIGNED_OUT"
        ) {

            showLogin();

        }

    }
);


// =========================================
// RESTORE SESSION AFTER REFRESH
// =========================================

async function restoreSession() {

    const {
        data,
        error
    } = await supabase.auth.getSession();


    if (error) {

        console.error(
            "Session restore error:",
            error
        );

        showLogin();

        return;
    }


    if (data?.session) {

        console.log(
            "Existing session restored."
        );

        await openUserDashboard(
            data.session
        );

    } else {

        showLogin();

    }
}


// =========================================
// LOGOUT
// =========================================

async function logout() {

    await supabase.auth.signOut();

    hideAllSections();

    const loginSection =
        document.getElementById(
            "loginSection"
        );

    if (loginSection) {

        loginSection.style.display =
            "block";

    }
}
// =========================================
// ADMIN - LOAD STUDENTS
// =========================================

async function loadAdminStudentsForDate() {

    const dateInput =
        document.getElementById(
            "attendanceDate"
        );

    const studentList =
        document.getElementById(
            "studentList"
        );


    if (
        !dateInput ||
        !studentList
    ) {
        return;
    }


    const date =
        dateInput.value;


    if (!date) {
        return;
    }


    studentList.innerHTML =
        `<div class="admin-loading">
            Loading students...
        </div>`;


    // =========================================
    // LOAD STUDENTS
    // =========================================

    const {
        data: students,
        error
    } = await supabase
        .from("profiles")
        .select("id, name")
        .eq("role", "student")
        .order("name");


    if (error) {

        console.error(
            "Student loading error:",
            error
        );

        studentList.innerHTML =
            `<div class="admin-error">
                Error loading students:
                ${error.message}
            </div>`;

        return;
    }


    // =========================================
    // LOAD EXISTING ATTENDANCE
    // =========================================

    const {
        data: attendance,
        error: attendanceError
    } = await supabase
        .from("Attendance")
        .select(
            "user_id, present"
        )
        .eq(
            "attendance_date",
            date
        );


    if (attendanceError) {

        console.error(
            "Attendance loading error:",
            attendanceError
        );

        studentList.innerHTML =
            `<div class="admin-error">
                Error loading attendance:
                ${attendanceError.message}
            </div>`;

        return;
    }


    // =========================================
    // CREATE ATTENDANCE MAP
    // =========================================

    const attendanceMap = {};


    (attendance || []).forEach(
        record => {

            attendanceMap[
                record.user_id
            ] = record.present;

        }
    );


    // =========================================
    // NO STUDENTS
    // =========================================

    if (
        !students ||
        students.length === 0
    ) {

        studentList.innerHTML =
            `<div class="admin-empty">
                No students found.
            </div>`;

        await loadAdminAbsentees(date);

        return;
    }


    // =========================================
    // CLEAR LIST
    // =========================================

    studentList.innerHTML = "";


    // =========================================
    // CREATE STUDENT ROWS
    // =========================================

    students.forEach(
        student => {

            const row =
                document.createElement(
                    "div"
                );

            row.className =
                "admin-student-row";


            const studentName =
                document.createElement(
                    "div"
                );

            studentName.className =
                "admin-student-name";


            studentName.textContent =
                student.name ||
                "Unnamed Student";


            // =====================================
            // ATTENDANCE OPTIONS
            // =====================================

            const options =
                document.createElement(
                    "div"
                );

            options.className =
                "admin-attendance-options";


            const existingRecord =
                attendanceMap[
                    student.id
                ];


            // =====================================
            // PRESENT
            // =====================================

            const presentLabel =
                document.createElement(
                    "label"
                );

            presentLabel.className =
                "admin-status-option present-option";


            const presentRadio =
                document.createElement(
                    "input"
                );

            presentRadio.type =
                "radio";

            presentRadio.name =
                `attendance_${student.id}`;

            presentRadio.value =
                "present";

            presentRadio.className =
                "admin-attendance-radio";

            presentRadio.dataset.userId =
                student.id;


            if (
                existingRecord === true
            ) {

                presentRadio.checked =
                    true;

            }


            const presentText =
                document.createElement(
                    "span"
                );

            presentText.textContent =
                "Present";


            presentLabel.appendChild(
                presentRadio
            );

            presentLabel.appendChild(
                presentText
            );


            // =====================================
            // ABSENT
            // =====================================

            const absentLabel =
                document.createElement(
                    "label"
                );

            absentLabel.className =
                "admin-status-option absent-option";


            const absentRadio =
                document.createElement(
                    "input"
                );

            absentRadio.type =
                "radio";

            absentRadio.name =
                `attendance_${student.id}`;

            absentRadio.value =
                "absent";

            absentRadio.className =
                "admin-attendance-radio";

            absentRadio.dataset.userId =
                student.id;


            if (
                existingRecord === false
            ) {

                absentRadio.checked =
                    true;

            }


            const absentText =
                document.createElement(
                    "span"
                );

            absentText.textContent =
                "Absent";


            absentLabel.appendChild(
                absentRadio
            );

            absentLabel.appendChild(
                absentText
            );


            // =====================================
            // ADD OPTIONS
            // =====================================

            options.appendChild(
                presentLabel
            );

            options.appendChild(
                absentLabel
            );


            // =====================================
            // ADD ROW
            // =====================================

            row.appendChild(
                studentName
            );

            row.appendChild(
                options
            );


            studentList.appendChild(
                row
            );

        }
    );


    // =========================================
    // LOAD ABSENTEES
    // =========================================

    await loadAdminAbsentees(date);

}

// =========================================
// ADMIN - SAVE ATTENDANCE
// =========================================

async function saveAttendance() {

    const dateInput =
        document.getElementById(
            "attendanceDate"
        );

    const message =
        document.getElementById(
            "attendanceMessage"
        );


    if (!dateInput || !message) {
        return;
    }


    const date =
        dateInput.value;


    if (!date) {

        message.textContent =
            "Please select a date.";

        return;
    }


    const radios =
        document.querySelectorAll(
            ".admin-attendance-radio"
        );


    if (!radios.length) {

        message.textContent =
            "No students available.";

        return;
    }


    // =========================================
    // COLLECT ONE SELECTION PER STUDENT
    // =========================================

    const attendanceToSave = {};

    let incomplete =
        false;


    radios.forEach(
        radio => {

            const userId =
                radio.dataset.userId;


            if (!attendanceToSave[userId]) {

                attendanceToSave[userId] =
                    null;

            }


            if (radio.checked) {

                attendanceToSave[userId] =
                    radio.value ===
                    "present";

            }

        }
    );


    // =========================================
    // CHECK EVERY STUDENT IS MARKED
    // =========================================

    for (
        const userId in attendanceToSave
    ) {

        if (
            attendanceToSave[userId] ===
            null
        ) {

            incomplete =
                true;

            break;

        }

    }


    if (incomplete) {

        message.textContent =
            "Please mark Present or Absent for every student.";

        return;
    }


    message.textContent =
        "Saving attendance...";


    // =========================================
    // SAVE EACH STUDENT
    // =========================================

    for (
        const userId in attendanceToSave
    ) {

        const present =
            attendanceToSave[userId];


        // =====================================
        // CHECK EXISTING RECORD
        // =====================================

        const {
            data: existing,
            error: checkError
        } = await supabase
            .from("Attendance")
            .select("id")
            .eq(
                "user_id",
                userId
            )
            .eq(
                "attendance_date",
                date
            )
            .limit(1);


        if (checkError) {

            console.error(
                "Attendance check error:",
                checkError
            );

            message.textContent =
                "Error checking attendance.";

            return;
        }


        // =====================================
        // UPDATE EXISTING
        // =====================================

        if (
            existing &&
            existing.length > 0
        ) {

            const {
                error
            } = await supabase
                .from("Attendance")
                .update({
                    present:
                        present
                })
                .eq(
                    "id",
                    existing[0].id
                );


            if (error) {

                console.error(error);

                message.textContent =
                    "Error updating attendance.";

                return;
            }

        }


        // =====================================
        // INSERT NEW
        // =====================================

        else {

            const {
                error
            } = await supabase
                .from("Attendance")
                .insert({

                    user_id:
                        userId,

                    attendance_date:
                        date,

                    present:
                        present

                });


            if (error) {

                console.error(error);

                message.textContent =
                    "Error saving attendance.";

                return;
            }

        }

    }


    // =========================================
    // SUCCESS
    // =========================================

    message.textContent =
        "✓ Attendance saved successfully.";


    // Refresh student attendance
    await loadAdminStudentsForDate();


    // Refresh history
    await loadAdminAttendance();

}
// =========================================
// ADMIN - ATTENDANCE HISTORY
// DAILY SUMMARY
// =========================================

async function loadAdminAttendance() {

    const history =
        document.getElementById(
            "adminAttendanceHistory"
        );


    if (!history) {
        return;
    }


    history.innerHTML =
        `<div class="admin-loading">
            Loading attendance history...
        </div>`;


    // =========================================
    // LOAD ATTENDANCE
    // =========================================

    const {
        data,
        error
    } = await supabase
        .from("Attendance")
        .select(
            "user_id, attendance_date, present"
        )
        .order(
            "attendance_date",
            {
                ascending: false
            }
        );


    if (error) {

        console.error(
            "Attendance history error:",
            error
        );

        history.innerHTML =
            `<div class="admin-error">
                Error loading attendance.
            </div>`;

        return;
    }


    if (
        !data ||
        data.length === 0
    ) {

        history.innerHTML =
            `<div class="admin-empty">
                No attendance records found.
            </div>`;

        return;
    }


    // =========================================
    // LOAD STUDENT NAMES
    // =========================================

    const {
        data: students,
        error: studentsError
    } = await supabase
        .from("profiles")
        .select(
            "id, name"
        )
        .eq(
            "role",
            "student"
        );


    if (studentsError) {

        console.error(
            "Student names error:",
            studentsError
        );

        history.innerHTML =
            `<div class="admin-error">
                Error loading student names.
            </div>`;

        return;
    }


    // =========================================
    // CREATE NAME MAP
    // =========================================

    const nameMap = {};


    (students || []).forEach(
        student => {

            nameMap[
                student.id
            ] =
                student.name ||
                "Unnamed Student";

        }
    );


    // =========================================
    // GROUP ATTENDANCE BY DATE
    // =========================================

    const dateMap = {};


    data.forEach(
        record => {

            if (
                !dateMap[
                    record.attendance_date
                ]
            ) {

                dateMap[
                    record.attendance_date
                ] = {
                    present: [],
                    absent: []
                };

            }


            const studentName =
                nameMap[
                    record.user_id
                ] ||
                "Unknown Student";


            if (
                record.present === true
            ) {

                dateMap[
                    record.attendance_date
                ].present.push(
                    studentName
                );

            } else {

                dateMap[
                    record.attendance_date
                ].absent.push(
                    studentName
                );

            }

        }
    );


    // =========================================
    // CLEAR HISTORY
    // =========================================

    history.innerHTML = "";


    // =========================================
    // CREATE DAILY HISTORY
    // =========================================

    Object.keys(dateMap)
        .sort(
            (a, b) =>
                b.localeCompare(a)
        )
        .forEach(
            date => {

                const dayData =
                    dateMap[date];


                // =====================================
                // MAIN DAILY ROW
                // =====================================

                const dayContainer =
                    document.createElement(
                        "div"
                    );

                dayContainer.className =
                    "admin-daily-history";


                // =====================================
                // DATE
                // =====================================

                const dateObject =
                    new Date(
                        date +
                        "T00:00:00"
                    );


                const dateText =
                    dateObject.toLocaleDateString(
                        "en-IN",
                        {
                            day: "2-digit",
                            month: "2-digit",
                            year: "numeric"
                        }
                    );


                const dateCell =
                    document.createElement(
                        "div"
                    );

                dateCell.className =
                    "admin-daily-date";

                dateCell.textContent =
                    dateText;


                // =====================================
                // PRESENT BUTTON
                // =====================================

                const presentButton =
                    document.createElement(
                        "button"
                    );

                presentButton.type =
                    "button";

                presentButton.className =
                    "admin-history-count present-count";

                presentButton.textContent =
                    `${dayData.present.length} Presentee${dayData.present.length === 1 ? "" : "s"}`;


                // =====================================
                // ABSENT BUTTON
                // =====================================

                const absentButton =
                    document.createElement(
                        "button"
                    );

                absentButton.type =
                    "button";

                absentButton.className =
                    "admin-history-count absent-count";

                absentButton.textContent =
                    `${dayData.absent.length} Absentee${dayData.absent.length === 1 ? "" : "s"}`;


                // =====================================
                // NAME LIST CONTAINER
                // =====================================

                const namesContainer =
                    document.createElement(
                        "div"
                    );

                namesContainer.className =
                    "admin-history-names";


                // =====================================
                // PRESENT NAMES
                // =====================================

                const presentNames =
                    document.createElement(
                        "div"
                    );

                presentNames.className =
                    "admin-history-name-group present-name-group";

                presentNames.style.display =
                    "none";


                const presentTitle =
                    document.createElement(
                        "div"
                    );

                presentTitle.className =
                    "admin-history-name-title";

                presentTitle.textContent =
                    "Presentees";


                presentNames.appendChild(
                    presentTitle
                );


                dayData.present.forEach(
                    (name, index) => {

                        const nameRow =
                            document.createElement(
                                "div"
                            );

                        nameRow.className =
                            "admin-history-name-row";

                        nameRow.textContent =
                            `${index + 1}. ${name}`;

                        presentNames.appendChild(
                            nameRow
                        );

                    }
                );


                // =====================================
                // ABSENT NAMES
                // =====================================

                const absentNames =
                    document.createElement(
                        "div"
                    );

                absentNames.className =
                    "admin-history-name-group absent-name-group";

                absentNames.style.display =
                    "none";


                const absentTitle =
                    document.createElement(
                        "div"
                    );

                absentTitle.className =
                    "admin-history-name-title";

                absentTitle.textContent =
                    "Absentees";


                absentNames.appendChild(
                    absentTitle
                );


                dayData.absent.forEach(
                    (name, index) => {

                        const nameRow =
                            document.createElement(
                                "div"
                            );

                        nameRow.className =
                            "admin-history-name-row";

                        nameRow.textContent =
                            `${index + 1}. ${name}`;

                        absentNames.appendChild(
                            nameRow
                        );

                    }
                );


                namesContainer.appendChild(
                    presentNames
                );

                namesContainer.appendChild(
                    absentNames
                );


                // =====================================
                // BUTTON CLICK - PRESENT
                // =====================================

                presentButton.addEventListener(
                    "click",
                    () => {

                        const isHidden =
                            presentNames.style.display ===
                            "none";


                        presentNames.style.display =
                            isHidden
                                ? "block"
                                : "none";


                        presentButton.classList.toggle(
                            "active",
                            isHidden
                        );

                    }
                );


                // =====================================
                // BUTTON CLICK - ABSENT
                // =====================================

                absentButton.addEventListener(
                    "click",
                    () => {

                        const isHidden =
                            absentNames.style.display ===
                            "none";


                        absentNames.style.display =
                            isHidden
                                ? "block"
                                : "none";


                        absentButton.classList.toggle(
                            "active",
                            isHidden
                        );

                    }
                );


                // =====================================
                // DAILY ROW
                // =====================================

                const dailyTop =
                    document.createElement(
                        "div"
                    );

                dailyTop.className =
                    "admin-daily-top";


                dailyTop.appendChild(
                    dateCell
                );

                dailyTop.appendChild(
                    presentButton
                );

                dailyTop.appendChild(
                    absentButton
                );


                dayContainer.appendChild(
                    dailyTop
                );

                dayContainer.appendChild(
                    namesContainer
                );


                history.appendChild(
                    dayContainer
                );

            }
        );

}
// =========================================
// ADMIN - ABSENTEES
// =========================================

async function loadAdminAbsentees(date) {

    const list =
        document.getElementById(
            "adminAbsenteesList"
        );


    if (!list) {
        return;
    }


    list.innerHTML =
        `<div class="admin-loading">
            Loading...
        </div>`;


    // =========================================
    // LOAD STUDENTS
    // =========================================

    const {
        data: students,
        error: studentsError
    } = await supabase
        .from("profiles")
        .select(
            "id, name"
        )
        .eq(
            "role",
            "student"
        )
        .order(
            "name"
        );


    if (studentsError) {

        console.error(
            studentsError
        );

        list.innerHTML =
            `<div class="admin-error">
                Error loading students.
            </div>`;

        return;
    }


    // =========================================
    // LOAD ATTENDANCE
    // =========================================

    const {
        data: attendance,
        error: attendanceError
    } = await supabase
        .from("Attendance")
        .select(
            "user_id, present"
        )
        .eq(
            "attendance_date",
            date
        );


    if (attendanceError) {

        console.error(
            attendanceError
        );

        list.innerHTML =
            `<div class="admin-error">
                Error loading attendance.
            </div>`;

        return;
    }


    // =========================================
    // CREATE ATTENDANCE MAP
    // =========================================

    const attendanceMap = {};


    (attendance || []).forEach(
        record => {

            attendanceMap[
                record.user_id
            ] = record.present;

        }
    );


    // =========================================
    // ONLY TRUE ABSENTEES
    // =========================================

    const absentees =
        students.filter(
            student =>
                attendanceMap[
                    student.id
                ] === false
        );


    // =========================================
    // NO ABSENTEES
    // =========================================

    if (
        absentees.length === 0
    ) {

        list.innerHTML =
            `<div class="admin-no-absentees">
                ✓ No absentees for this date.
            </div>`;

        return;
    }


    // =========================================
    // DISPLAY ABSENTEES
    // =========================================

    list.innerHTML = "";


    absentees.forEach(
        (student, index) => {

            const row =
                document.createElement(
                    "div"
                );

            row.className =
                "admin-absentee-row";


            const number =
                document.createElement(
                    "span"
                );

            number.className =
                "admin-absentee-number";

            number.textContent =
                `${index + 1}.`;


            const name =
                document.createElement(
                    "span"
                );

            name.className =
                "admin-absentee-name";

            name.textContent =
                student.name ||
                "Unnamed Student";


            row.appendChild(
                number
            );

            row.appendChild(
                name
            );


            list.appendChild(
                row
            );

        }
    );

}
// =========================================
// STUDENT - CHECK SELECTED DATE
// =========================================

async function checkSelectedAttendanceDate() {

    const dateInput =
        document.getElementById(
            "studentAttendanceDate"
        );

    const selectedDateText =
        document.getElementById(
            "selectedAttendanceDate"
        );

    const status =
        document.getElementById(
            "todayAttendanceStatus"
        );

    const presentButton =
        document.getElementById(
            "studentPresentButton"
        );

    const absentButton =
        document.getElementById(
            "studentAbsentButton"
        );

    const message =
        document.getElementById(
            "studentAttendanceMessage"
        );


    if (!dateInput) {
        return;
    }


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


    // =========================================
    // UPDATE SELECTED DATE DISPLAY
    // =========================================

    if (selectedDateText) {

        if (selectedDate) {

            const selectedDateObject =
                new Date(
                    selectedDate +
                    "T00:00:00"
                );

            selectedDateText.textContent =
                selectedDateObject.toLocaleDateString(
                    "en-IN",
                    {
                        weekday: "long",
                        day: "2-digit",
                        month: "long",
                        year: "numeric"
                    }
                );

        } else {

            selectedDateText.textContent =
                "-";

        }

    }


    // =========================================
    // RESET BUTTONS / MESSAGE
    // =========================================

    if (presentButton) {
        presentButton.disabled = false;
    }

    if (absentButton) {
        absentButton.disabled = false;
    }

    if (message) {
        message.textContent = "";
    }


    // =========================================
    // NO DATE SELECTED
    // =========================================

    if (!selectedDate) {

        if (status) {
            status.textContent =
                "Please select a date.";
        }

        if (presentButton) {
            presentButton.disabled = true;
        }

        if (absentButton) {
            absentButton.disabled = true;
        }

        return;
    }


    // =========================================
    // FUTURE / OLD DATE
    // =========================================

    if (
        !allowedDates.includes(
            selectedDate
        )
    ) {

        if (status) {

            if (selectedDate > today) {

                status.textContent =
                    "Future dates are not available.";

            } else {

                status.textContent =
                    "Attendance can only be entered for today, yesterday, or the day before yesterday.";

            }

        }


        if (presentButton) {
            presentButton.disabled = true;
        }

        if (absentButton) {
            absentButton.disabled = true;
        }

        return;
    }


    // =========================================
    // GET CURRENT USER
    // =========================================

    const {
        data: {
            user
        },
        error: userError
    } = await supabase.auth.getUser();


    if (
        userError ||
        !user
    ) {

        if (status) {
            status.textContent =
                "Please login again.";
        }

        if (presentButton) {
            presentButton.disabled = true;
        }

        if (absentButton) {
            absentButton.disabled = true;
        }

        return;
    }


    // =========================================
    // CHECK EXISTING RECORD
    // =========================================

    const {
        data: existing,
        error
    } = await supabase
        .from("Attendance")
        .select(
            "id, present"
        )
        .eq(
            "user_id",
            user.id
        )
        .eq(
            "attendance_date",
            selectedDate
        )
        .limit(1);


    if (error) {

        console.error(
            "Attendance check error:",
            error
        );

        if (status) {
            status.textContent =
                "Unable to check attendance.";
        }

        if (presentButton) {
            presentButton.disabled = true;
        }

        if (absentButton) {
            absentButton.disabled = true;
        }

        return;
    }


    // =========================================
    // ALREADY SUBMITTED = LOCKED
    // =========================================

    if (
        existing &&
        existing.length > 0
    ) {

        const record =
            existing[0];


        if (status) {

            status.textContent =
                record.present
                    ? "Present ✓"
                    : "Absent ✕";

        }


        if (message) {

            message.textContent =
                "Attendance already submitted. This record is locked and cannot be changed.";

        }


        if (presentButton) {
            presentButton.disabled = true;
        }

        if (absentButton) {
            absentButton.disabled = true;
        }

        return;
    }


    // =========================================
    // NOT SUBMITTED
    // =========================================

    if (status) {

        status.textContent =
            "Not submitted yet.";

    }


    if (message) {

        message.textContent =
            "You can submit attendance for this date.";

    }


    if (presentButton) {
        presentButton.disabled = false;
    }

    if (absentButton) {
        absentButton.disabled = false;
    }

}
// =========================================
// STUDENT - SUBMIT ATTENDANCE
// =========================================

async function setMyAttendance(present) {

    const dateInput =
        document.getElementById(
            "studentAttendanceDate"
        );

    const status =
        document.getElementById(
            "todayAttendanceStatus"
        );

    const message =
        document.getElementById(
            "studentAttendanceMessage"
        );

    const presentButton =
        document.getElementById(
            "studentPresentButton"
        );

    const absentButton =
        document.getElementById(
            "studentAbsentButton"
        );


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


    // =========================================
    // CHECK DATE
    // =========================================

    if (
        !allowedDates.includes(
            selectedDate
        )
    ) {

        message.textContent =
            "You can only submit attendance for today, yesterday, or the day before yesterday.";

        return;
    }


    // =========================================
    // GET USER
    // =========================================

    const {
        data: {
            user
        },
        error: userError
    } = await supabase.auth.getUser();


    if (
        userError ||
        !user
    ) {

        message.textContent =
            "Please login again.";

        return;
    }


    message.textContent =
        "Submitting attendance...";


    // =========================================
    // CHECK AGAIN BEFORE INSERT
    // =========================================

    const {
        data: existing,
        error: checkError
    } = await supabase
        .from("Attendance")
        .select(
            "id, present"
        )
        .eq(
            "user_id",
            user.id
        )
        .eq(
            "attendance_date",
            selectedDate
        )
        .limit(1);


    if (checkError) {

        console.error(checkError);

        message.textContent =
            "Unable to check existing attendance.";

        return;
    }


    // =========================================
    // EXISTING RECORD = DO NOT CHANGE
    // =========================================

    if (
        existing &&
        existing.length > 0
    ) {

        const record =
            existing[0];


        status.textContent =
            record.present
                ? "Present ✓"
                : "Absent ✕";


        message.textContent =
            "Attendance was already submitted and is locked.";


        presentButton.disabled =
            true;

        absentButton.disabled =
            true;


        await loadMyAttendance();

        return;
    }


    // =========================================
    // INSERT NEW RECORD
    // =========================================

    const {
        error: insertError
    } = await supabase
        .from("Attendance")
        .insert({

            user_id:
                user.id,

            attendance_date:
                selectedDate,

            present:
                present

        });


    if (insertError) {

        console.error(
            insertError
        );

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


    presentButton.disabled =
        true;

    absentButton.disabled =
        true;


    await loadMyAttendance();
}


// =========================================
// STUDENT - LOAD ATTENDANCE
// =========================================
async function loadMyAttendance() {

    const dateInput =
        document.getElementById(
            "studentAttendanceDate"
        );

    const history =
        document.getElementById(
            "attendanceHistory"
        );

    const percentage =
        document.getElementById(
            "attendancePercentage"
        );

    const totalDays =
        document.getElementById(
            "totalDays"
        );

    const presentDays =
        document.getElementById(
            "presentDays"
        );

    const absentDays =
        document.getElementById(
            "absentDays"
        );

    const monthTitle =
        document.getElementById(
            "attendanceMonthTitle"
        );


    // =========================================
    // CHECK ELEMENTS
    // =========================================

    if (!dateInput || !history) {
        return;
    }


    // =========================================
    // TODAY / ALLOWED DATES
    // =========================================

    const today =
        getLocalDateString();

    const minimumDate =
        getDateOffset(-2);


    // =========================================
    // DATE PICKER
    // =========================================

    dateInput.min =
        minimumDate;

    dateInput.max =
        today;

    if (!dateInput.value) {

        dateInput.value =
            today;

    }


    // =========================================
    // UPDATE SELECTED DATE DISPLAY
    // =========================================

    const selectedDateText =
        document.getElementById(
            "selectedAttendanceDate"
        );

    if (selectedDateText) {

        const selectedDate =
            new Date(
                dateInput.value +
                "T00:00:00"
            );

        selectedDateText.textContent =
            selectedDate.toLocaleDateString(
                "en-IN",
                {
                    weekday: "long",
                    day: "2-digit",
                    month: "long",
                    year: "numeric"
                }
            );

    }


    // =========================================
    // GET CURRENT USER
    // =========================================

    const {
        data: {
            user
        },
        error: userError
    } =
        await supabase.auth.getUser();


    if (
        userError ||
        !user
    ) {

        console.error(
            "User not found:",
            userError
        );

        return;

    }


    // =========================================
    // LOAD ATTENDANCE
    // =========================================

    const {
        data,
        error
    } =
        await supabase
            .from("Attendance")
            .select(
                "id, attendance_date, present"
            )
            .eq(
                "user_id",
                user.id
            )
            .order(
                "attendance_date",
                {
                    ascending: true
                }
            );


    if (error) {

        console.error(
            "Attendance loading error:",
            error
        );

        history.innerHTML =
            `
            <div class="attendance-error">
                Error loading attendance.
            </div>
            `;

        return;

    }


    const records =
        data || [];


    // =========================================
    // CREATE ATTENDANCE MAP
    // =========================================

    const attendanceMap = {};


    records.forEach(
        record => {

            if (
                !attendanceMap[
                    record.attendance_date
                ]
            ) {

                attendanceMap[
                    record.attendance_date
                ] = record;

            }

        }
    );


    // =========================================
    // CURRENT MONTH
    // =========================================

    const now =
        new Date();

    const currentYear =
        now.getFullYear();

    const currentMonth =
        now.getMonth();


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


    const daysInMonth =
        lastDay.getDate();


    // =========================================
    // MONTH TITLE
    // =========================================

    if (monthTitle) {

        monthTitle.textContent =
            firstDay.toLocaleString(
                "en-US",
                {
                    month: "long",
                    year: "numeric"
                }
            );

    }


    // =========================================
    // MONTH ATTENDANCE COUNT
    // =========================================

    const monthRecords =
        records.filter(
            record => {

                const recordDate =
                    new Date(
                        record.attendance_date +
                        "T00:00:00"
                    );

                return (
                    recordDate.getFullYear() ===
                        currentYear &&
                    recordDate.getMonth() ===
                        currentMonth
                );

            }
        );


    const totalRecorded =
        monthRecords.length;


    const presentCount =
        monthRecords.filter(
            record =>
                record.present === true
        ).length;


    const absentCount =
        monthRecords.filter(
            record =>
                record.present === false
        ).length;


    const attendancePercentageValue =
        totalRecorded > 0
            ? Math.round(
                (
                    presentCount /
                    totalRecorded
                ) * 100
            )
            : 0;


    // =========================================
    // UPDATE SUMMARY CARDS
    // =========================================

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
    // CLEAR CALENDAR
    // =========================================

    history.innerHTML = "";


    // =========================================
    // EMPTY CELLS BEFORE FIRST DAY
    // =========================================

    const firstWeekday =
        firstDay.getDay();


    for (
        let i = 0;
        i < firstWeekday;
        i++
    ) {

        const emptyCell =
            document.createElement(
                "div"
            );

        emptyCell.className =
            "attendance-empty-day";

        history.appendChild(
            emptyCell
        );

    }


    // =========================================
    // CREATE CALENDAR DAYS
    // =========================================

    for (
        let day = 1;
        day <= daysInMonth;
        day++
    ) {

        const date =
            new Date(
                currentYear,
                currentMonth,
                day
            );


        const dateString =
            getLocalDateString(
                date
            );


        const record =
            attendanceMap[
                dateString
            ];


        const dayCell =
            document.createElement(
                "div"
            );


        dayCell.className =
            "attendance-day";


        // =====================================
        // DAY NUMBER
        // =====================================

        const dayNumber =
            document.createElement(
                "div"
            );

        dayNumber.className =
            "attendance-day-number";

        dayNumber.textContent =
            day;


        // =====================================
        // STATUS
        // =====================================

        const status =
            document.createElement(
                "div"
            );

        status.className =
            "attendance-day-status";


        // =====================================
        // TODAY
        // =====================================

        if (
            dateString === today
        ) {

            dayCell.classList.add(
                "today"
            );

        }


        // =====================================
        // FUTURE
        // =====================================

        if (
            dateString > today
        ) {

            dayCell.classList.add(
                "future"
            );

            status.textContent =
                "—";

        }


        // =====================================
        // PRESENT
        // =====================================

        else if (
            record &&
            record.present === true
        ) {

            dayCell.classList.add(
                "present"
            );

            status.textContent =
                "✓";

        }


        // =====================================
        // ABSENT
        // =====================================

        else if (
            record &&
            record.present === false
        ) {

            dayCell.classList.add(
                "absent"
            );

            status.textContent =
                "✕";

        }


        // =====================================
        // NOT RECORDED
        // =====================================

        else {

            dayCell.classList.add(
                "not-recorded"
            );

            status.textContent =
                "—";

        }


        // =====================================
        // ADD CONTENT
        // =====================================

        dayCell.appendChild(
            dayNumber
        );

        dayCell.appendChild(
            status
        );


        history.appendChild(
            dayCell
        );

    }


    // =========================================
    // CHECK SELECTED ATTENDANCE DATE
    // =========================================

    await checkSelectedAttendanceDate();

}
// =========================================
// PAGE LOAD
// =========================================

document.addEventListener(
    "DOMContentLoaded",
    async () => {

        console.log(
            "Mission Fajr loaded successfully."
        );

        await restoreSession();

    }
);
// =========================================
// MISSION FAJR - PWA SERVICE WORKER
// =========================================

if ("serviceWorker" in navigator) {

    window.addEventListener("load", () => {

        navigator.serviceWorker
            .register("./service-worker.js")
            .then(() => {

                console.log(
                    "Mission Fajr service worker registered."
                );

            })
            .catch(error => {

                console.error(
                    "Service worker registration failed:",
                    error
                );

            });

    });

}
