
const SUPABASE_URL = "https://mxxmhlkmjndrzpfgtiay.supabase.co";

const SUPABASE_KEY =
    "sb_publishable_qOsBWh1PK3SXb2-AqAhH8A_XJ5GL4XA";

const supabase = window.supabase.createClient(
    SUPABASE_URL,
    SUPABASE_KEY
);



// =========================================
// PAGE SECTIONS
// =========================================

function hideAllSections() {

    const sections = [
        "loginSection",
        "signupSection",
        "forgotPasswordSection",
        "resetPasswordSection",
        "adminDashboard",
        "studentDashboard"
    ];

    sections.forEach(id => {

        const element = document.getElementById(id);

        if (element) {
            element.style.display = "none";
        }

    });

}



// =========================================
// SHOW LOGIN
// =========================================

function showLogin() {

    hideAllSections();

    const section =
        document.getElementById("loginSection");

    if (section) {
        section.style.display = "block";
    }

}



// =========================================
// SHOW SIGN UP
// =========================================

function showSignup() {

    hideAllSections();

    const section =
        document.getElementById("signupSection");

    if (section) {
        section.style.display = "block";
    }

    const message =
        document.getElementById("signupMessage");

    if (message) {
        message.innerText = "";
    }

}



// =========================================
// SHOW FORGOT PASSWORD
// =========================================

function showForgotPassword() {

    hideAllSections();

    const section =
        document.getElementById("forgotPasswordSection");

    if (section) {
        section.style.display = "block";
    }

    const message =
        document.getElementById("forgotMessage");

    if (message) {
        message.innerText = "";
    }

}



// =========================================
// LOGIN
// =========================================

async function login() {

    const emailInput =
        document.getElementById("email");

    const passwordInput =
        document.getElementById("password");

    const message =
        document.getElementById("message");


    if (!emailInput || !passwordInput || !message) {
        console.error("Login elements are missing.");
        return;
    }


    const loginValue =
        emailInput.value.trim();

    const password =
        passwordInput.value;


    if (loginValue === "" || password === "") {

        message.innerText =
            "Please enter email/mobile number and password.";

        return;
    }


    message.innerText =
        "Logging in...";


    try {

        let userId = null;


        // =========================================
        // EMAIL LOGIN
        // =========================================

        if (loginValue.includes("@")) {

            const {
                data: authData,
                error: authError
            } = await supabase.auth.signInWithPassword({

                email: loginValue,

                password: password

            });


            if (authError) {

                message.innerText =
                    "Login failed: " +
                    authError.message;

                return;
            }


            if (!authData || !authData.user) {

                message.innerText =
                    "Login failed: User not found.";

                return;
            }


            userId =
                authData.user.id;

        }


        // =========================================
        // MOBILE NUMBER LOGIN
        // =========================================

        else {

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
                    "Mobile login error:",
                    error
                );

                message.innerText =
                    "Login failed. Please check your mobile number and password.";

                return;
            }


            if (
                !data ||
                !data.success ||
                !data.session
            ) {

                message.innerText =
                    data && data.error
                        ? data.error
                        : "Login failed. Please check your mobile number and password.";

                return;
            }


            // Set the session returned by Edge Function
            const {
                error: sessionError
            } = await supabase.auth.setSession({

                access_token:
                    data.session.access_token,

                refresh_token:
                    data.session.refresh_token

            });


            if (sessionError) {

                console.error(
                    "Session error:",
                    sessionError
                );

                message.innerText =
                    "Login failed. Please try again.";

                return;
            }


            userId =
                data.session.user.id;

        }



        // =========================================
        // GET USER PROFILE
        // =========================================

        const {
            data: profile,
            error: profileError
        } = await supabase
            .from("profiles")
            .select("name, role")
            .eq("id", userId)
            .single();


        if (profileError) {

            message.innerText =
                "Profile error: " +
                profileError.message;

            await supabase.auth.signOut();

            return;
        }



        // =========================================
        // ADMIN
        // =========================================

        if (profile.role === "admin") {

            hideAllSections();

            const adminDashboard =
                document.getElementById("adminDashboard");

            if (adminDashboard) {
                adminDashboard.style.display = "block";
            }


            const dateInput =
                document.getElementById("attendanceDate");

            if (dateInput) {
                dateInput.value =
                    getLocalDateString();
            }


            await loadAdminStudentsForDate();

            await loadAdminAttendance();

            return;
        }



        // =========================================
        // STUDENT
        // =========================================

        if (profile.role === "student") {

            hideAllSections();

            const studentDashboard =
                document.getElementById("studentDashboard");

            if (studentDashboard) {
                studentDashboard.style.display = "block";
            }


            const welcome =
                document.getElementById("studentWelcome");


            if (welcome) {

                welcome.innerText =
                    "Welcome, " +
                    profile.name +
                    "!";

            }


            await loadMyAttendance();

            return;
        }



        message.innerText =
            "Unknown role: " +
            profile.role;

        await supabase.auth.signOut();

    }

    catch (error) {

        console.error(
            "Login error:",
            error
        );

        message.innerText =
            "Unexpected error: " +
            error.message;

    }

}



// =========================================
// SIGN UP
// =========================================

async function signup() {

    const nameInput =
        document.getElementById("signupName");

    const emailInput =
        document.getElementById("signupEmail");

    const phoneInput =
        document.getElementById("signupPhone");

    const passwordInput =
        document.getElementById("signupPassword");

    const confirmPasswordInput =
        document.getElementById("signupConfirmPassword");

    const message =
        document.getElementById("signupMessage");


    if (
        !nameInput ||
        !emailInput ||
        !phoneInput ||
        !passwordInput ||
        !confirmPasswordInput ||
        !message
    ) {

        console.error(
            "Sign-up elements are missing."
        );

        return;
    }


    const name =
        nameInput.value.trim();

    const email =
        emailInput.value.trim();

    const phone =
        phoneInput.value.trim();

    const password =
        passwordInput.value;

    const confirmPassword =
        confirmPasswordInput.value;



    if (
        name === "" ||
        email === "" ||
        phone === "" ||
        password === "" ||
        confirmPassword === ""
    ) {

        message.innerText =
            "Please fill in all fields.";

        return;
    }



    if (!email.includes("@")) {

        message.innerText =
            "Please enter a valid email address.";

        return;
    }



    if (password !== confirmPassword) {

        message.innerText =
            "Passwords do not match.";

        return;
    }



    if (password.length < 6) {

        message.innerText =
            "Password must be at least 6 characters.";

        return;
    }



    message.innerText =
        "Creating account...";



    try {

        /*
         * The profile is created automatically
         * by the Supabase database trigger.
         */

        const {
            data,
            error
        } = await supabase.auth.signUp({

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

            message.innerText =
                "Sign up failed: " +
                error.message;

            return;
        }



        if (!data || !data.user) {

            message.innerText =
                "Account creation failed.";

            return;
        }



        message.innerText =
            "Account created successfully. You can now login.";


        nameInput.value = "";
        emailInput.value = "";
        phoneInput.value = "";
        passwordInput.value = "";
        confirmPasswordInput.value = "";

    }

    catch (error) {

        console.error(
            "Sign-up error:",
            error
        );

        message.innerText =
            "Unexpected error: " +
            error.message;

    }

}



// =========================================
// SEND PASSWORD RECOVERY EMAIL
// =========================================

async function sendPasswordRecovery() {

    const emailInput =
        document.getElementById("forgotEmail");

    const message =
        document.getElementById("forgotMessage");


    if (!emailInput || !message) {
        return;
    }


    const email =
        emailInput.value.trim();



    if (email === "") {

        message.innerText =
            "Please enter your email address.";

        return;
    }



    if (!email.includes("@")) {

        message.innerText =
            "Please enter a valid email address.";

        return;
    }



    message.innerText =
        "Sending recovery email...";



    try {

        const {
            error
        } = await supabase.auth.resetPasswordForEmail(

            email,

            {
                redirectTo:
                    window.location.origin +
                    window.location.pathname
            }

        );



        if (error) {

            console.error(
                "Recovery error:",
                error
            );

            message.innerText =
                "Recovery failed: " +
                error.message;

            return;
        }



        message.innerText =
            "Recovery email sent. Check your email.";

    }

    catch (error) {

        console.error(
            "Password recovery error:",
            error
        );

        message.innerText =
            "Unexpected error: " +
            error.message;

    }

}



// =========================================
// UPDATE PASSWORD
// =========================================

async function updatePassword() {

    const passwordInput =
        document.getElementById("newPassword");

    const confirmPasswordInput =
        document.getElementById("confirmNewPassword");

    const message =
        document.getElementById("resetMessage");



    if (
        !passwordInput ||
        !confirmPasswordInput ||
        !message
    ) {
        return;
    }



    const newPassword =
        passwordInput.value;

    const confirmPassword =
        confirmPasswordInput.value;



    if (
        newPassword === "" ||
        confirmPassword === ""
    ) {

        message.innerText =
            "Please enter and confirm your new password.";

        return;
    }



    if (newPassword !== confirmPassword) {

        message.innerText =
            "Passwords do not match.";

        return;
    }



    if (newPassword.length < 6) {

        message.innerText =
            "Password must be at least 6 characters.";

        return;
    }



    message.innerText =
        "Updating password...";



    try {

        const {
            data,
            error
        } = await supabase.auth.updateUser({

            password: newPassword

        });



        if (error) {

            message.innerText =
                "Password update failed: " +
                error.message;

            return;
        }



        if (!data || !data.user) {

            message.innerText =
                "Password update failed.";

            return;
        }



        message.innerText =
            "Password updated successfully!";



        await supabase.auth.signOut();



        setTimeout(() => {

            showLogin();

        }, 1500);

    }

    catch (error) {

        console.error(
            "Password update error:",
            error
        );

        message.innerText =
            "Unexpected error: " +
            error.message;

    }

}



// =========================================
// PASSWORD RECOVERY SESSION
// =========================================

supabase.auth.onAuthStateChange(
    (event, session) => {

        console.log(
            "Supabase Auth Event:",
            event
        );



        if (event === "PASSWORD_RECOVERY") {

            hideAllSections();



            const resetSection =
                document.getElementById(
                    "resetPasswordSection"
                );



            if (resetSection) {

                resetSection.style.display =
                    "block";

            }



            const resetMessage =
                document.getElementById(
                    "resetMessage"
                );



            if (resetMessage) {

                resetMessage.innerText =
                    "Enter your new password.";

            }

        }

    }
);



// =========================================
// LOGOUT
// =========================================

async function logout() {

    try {

        await supabase.auth.signOut();

    }

    catch (error) {

        console.error(
            "Logout error:",
            error
        );

    }



    hideAllSections();



    const loginSection =
        document.getElementById("loginSection");



    if (loginSection) {
        loginSection.style.display = "block";
    }



    const message =
        document.getElementById("message");



    if (message) {
        message.innerText = "";
    }



    const attendanceMessage =
        document.getElementById("attendanceMessage");



    if (attendanceMessage) {
        attendanceMessage.innerText = "";
    }



    const studentMessage =
        document.getElementById(
            "studentAttendanceMessage"
        );



    if (studentMessage) {
        studentMessage.innerText = "";
    }



    const email =
        document.getElementById("email");



    if (email) {
        email.value = "";
    }



    const password =
        document.getElementById("password");



    if (password) {
        password.value = "";
    }

}



// =========================================
// GET LOCAL DATE
// =========================================

function getLocalDateString() {

    const now = new Date();

    return [
        now.getFullYear(),
        String(now.getMonth() + 1).padStart(2, "0"),
        String(now.getDate()).padStart(2, "0")
    ].join("-");

}



// =========================================
// LOAD STUDENTS FOR ADMIN + SELECT
// =========================================

async function loadAdminStudentsForDate() {

    const studentList =
        document.getElementById("studentList");

    const dateInput =
        document.getElementById("attendanceDate");

    if (!studentList || !dateInput) {
        return;
    }



    const date =
        dateInput.value;



    if (date === "") {

        studentList.innerText =
            "Please select a date.";

        return;
    }



    studentList.innerText =
        "Loading students...";



    try {

        const {
            data: students,
            error: studentError
        } = await supabase
            .from("profiles")
            .select("id, name")
            .eq("role", "student")
            .order("name");



        if (studentError) {

            console.error(
                "Student loading error:",
                studentError
            );

            studentList.innerText =
                "Error loading students: " +
                studentError.message;

            return;
        }



        if (
            !students ||
            students.length === 0
        ) {

            studentList.innerText =
                "No students found.";

            return;
        }



        const {
            data: attendance,
            error: attendanceError
        } = await supabase
            .from("Attendance")
            .select(
                "user_id, present"
            )
            .eq("attendance_date", date);



        if (attendanceError) {

            console.error(
                "Attendance loading error:",
                attendanceError
            );

            studentList.innerText =
                "Error loading attendance: " +
                attendanceError.message;

            return;
        }



        const attendanceMap = {};



        (attendance || []).forEach(record => {

            attendanceMap[record.user_id] =
                record.present;

        });



        studentList.innerHTML = "";



        students.forEach(student => {

            const row =
                document.createElement("div");

            row.className =
                "admin-student-row";



            const name =
                document.createElement("span");

            name.className =
                "admin-student-name";

            name.innerText =
                student.name;



            const controls =
                document.createElement("div");

            controls.className =
                "admin-attendance-controls";



            const presentLabel =
                document.createElement("label");

            presentLabel.className =
                "admin-present-option";



            const presentRadio =
                document.createElement("input");

            presentRadio.type =
                "radio";

            presentRadio.name =
                "attendance_" + student.id;

            presentRadio.value =
                "present";

            presentRadio.className =
                "adminAttendanceRadio";

            presentRadio.dataset.userId =
                student.id;



            const absentLabel =
                document.createElement("label");

            absentLabel.className =
                "admin-absent-option";



            const absentRadio =
                document.createElement("input");

            absentRadio.type =
                "radio";

            absentRadio.name =
                "attendance_" + student.id;

            absentRadio.value =
                "absent";

            absentRadio.className =
                "adminAttendanceRadio";

            absentRadio.dataset.userId =
                student.id;



            presentLabel.appendChild(
                presentRadio
            );

            presentLabel.appendChild(
                document.createTextNode(" Present")
            );



            absentLabel.appendChild(
                absentRadio
            );

            absentLabel.appendChild(
                document.createTextNode(" Absent")
            );



            controls.appendChild(
                presentLabel
            );

            controls.appendChild(
                absentLabel
            );



            row.appendChild(name);

            row.appendChild(controls);

            studentList.appendChild(row);



            if (
                Object.prototype.hasOwnProperty.call(
                    attendanceMap,
                    student.id
                )
            ) {

                if (
                    attendanceMap[student.id] === true
                ) {

                    presentRadio.checked = true;

                }
                else {

                    absentRadio.checked = true;

                }

            }

        });



        await loadAdminAbsentees(date);

    }

    catch (error) {

        console.error(
            "Admin student loading error:",
            error
        );

        studentList.innerText =
            "Unexpected error: " +
            error.message;

    }

}



// =========================================
// SAVE ADMIN ATTENDANCE
// =========================================

async function saveAttendance() {

    const dateInput =
        document.getElementById("attendanceDate");

    const message =
        document.getElementById("attendanceMessage");



    if (!dateInput || !message) {
        return;
    }



    const date =
        dateInput.value;



    if (date === "") {

        message.innerText =
            "Please select a date.";

        return;
    }



    const studentRows =
        document.querySelectorAll(
            ".admin-student-row"
        );



    if (studentRows.length === 0) {

        message.innerText =
            "No students found.";

        return;
    }



    message.innerText =
        "Saving attendance...";



    try {

        for (const row of studentRows) {

            const selected =
                row.querySelector(
                    'input[type="radio"]:checked'
                );



            if (!selected) {

                const studentName =
                    row.querySelector(
                        ".admin-student-name"
                    );

                message.innerText =
                    "Please select Present or Absent for " +
                    (
                        studentName
                            ? studentName.innerText
                            : "every student"
                    ) +
                    ".";

                return;
            }

        }



        for (const row of studentRows) {

            const selected =
                row.querySelector(
                    'input[type="radio"]:checked'
                );



            const userId =
                selected.dataset.userId;



            const present =
                selected.value === "present";



            const {
                data: existing,
                error: checkError
            } = await supabase
                .from("Attendance")
                .select("id")
                .eq("user_id", userId)
                .eq("attendance_date", date);



            if (checkError) {

                message.innerText =
                    "Error checking attendance: " +
                    checkError.message;

                return;
            }



            if (
                existing &&
                existing.length > 0
            ) {

                const {
                    error: updateError
                } = await supabase
                    .from("Attendance")
                    .update({
                        present: present
                    })
                    .eq("user_id", userId)
                    .eq("attendance_date", date);



                if (updateError) {

                    message.innerText =
                        "Error updating attendance: " +
                        updateError.message;

                    return;
                }

            }
            else {

                const {
                    error: insertError
                } = await supabase
                    .from("Attendance")
                    .insert({

                        user_id: userId,

                        attendance_date: date,

                        present: present

                    });



                if (insertError) {

                    message.innerText =
                        "Error saving attendance: " +
                        insertError.message;

                    return;
                }

            }

        }



        message.innerText =
            "Attendance saved successfully!";



        await loadAdminStudentsForDate();

        await loadAdminAttendance();

    }

    catch (error) {

        console.error(
            "Save attendance error:",
            error
        );

        message.innerText =
            "Unexpected error: " +
            error.message;

    }

}



// =========================================
// LOAD ADMIN ATTENDANCE HISTORY
// =========================================

async function loadAdminAttendance() {

    const adminHistory =
        document.getElementById(
            "adminAttendanceHistory"
        );



    if (!adminHistory) {
        return;
    }



    adminHistory.innerText =
        "Loading attendance...";



    try {

        const {
            data: attendance,
            error
        } = await supabase
            .from("Attendance")
            .select(`
                id,
                attendance_date,
                present,
                user_id
            `)
            .order(
                "attendance_date",
                {
                    ascending: false
                }
            );



        if (error) {

            console.error(
                "Admin attendance error:",
                error
            );

            adminHistory.innerText =
                "Error loading attendance: " +
                error.message;

            return;
        }



        if (
            !attendance ||
            attendance.length === 0
        ) {

            adminHistory.innerText =
                "No attendance records found.";

            return;
        }



        const {
            data: students,
            error: studentError
        } = await supabase
            .from("profiles")
            .select("id, name")
            .eq("role", "student");



        if (studentError) {

            adminHistory.innerText =
                "Error loading student names: " +
                studentError.message;

            return;
        }



        const studentMap = {};



        (students || []).forEach(student => {

            studentMap[student.id] =
                student.name;

        });



        adminHistory.innerHTML = "";



        attendance.forEach(record => {

            const row =
                document.createElement("p");



            const studentName =
                studentMap[record.user_id] ||
                "Unknown Student";



            const status =
                record.present === true
                    ? "Present"
                    : "Absent";



            row.innerText =
                record.attendance_date +
                " — " +
                studentName +
                " — " +
                status;



            row.className =
                record.present === true
                    ? "present-status"
                    : "absent-status";



            adminHistory.appendChild(row);

        });

    }

    catch (error) {

        console.error(
            "Admin history error:",
            error
        );

        adminHistory.innerText =
            "Unexpected error: " +
            error.message;

    }

}



// =========================================
// LOAD ADMIN ABSENTEES
// =========================================

async function loadAdminAbsentees(date) {

    const absenteesList =
        document.getElementById(
            "adminAbsenteesList"
        );



    if (!absenteesList) {
        return;
    }



    if (!date) {

        absenteesList.innerText =
            "Select a date to view absentees.";

        return;
    }



    absenteesList.innerText =
        "Loading absentees...";



    try {

        const {
            data: attendance,
            error
        } = await supabase
            .from("Attendance")
            .select(
                "user_id, present"
            )
            .eq(
                "attendance_date",
                date
            )
            .eq(
                "present",
                false
            );



        if (error) {

            absenteesList.innerText =
                "Error loading absentees: " +
                error.message;

            return;
        }



        if (
            !attendance ||
            attendance.length === 0
        ) {

            absenteesList.innerText =
                "No absentees for " +
                date +
                ".";

            return;
        }



        const userIds =
            attendance.map(
                record => record.user_id
            );



        const {
            data: students,
            error: studentError
        } = await supabase
            .from("profiles")
            .select("id, name")
            .in("id", userIds);



        if (studentError) {

            absenteesList.innerText =
                "Error loading absentee names: " +
                studentError.message;

            return;
        }



        absenteesList.innerHTML = "";



        (students || []).forEach(student => {

            const row =
                document.createElement("p");

            row.className =
                "admin-absentee-row";

            row.innerText =
                student.name;

            absenteesList.appendChild(row);

        });

    }

    catch (error) {

        console.error(
            "Absentee loading error:",
            error
        );

        absenteesList.innerText =
            "Unexpected error: " +
            error.message;

    }

}



// =========================================
// STUDENT ATTENDANCE
// =========================================

async function setMyAttendance(present) {

    const message =
        document.getElementById(
            "studentAttendanceMessage"
        );

    const statusElement =
        document.getElementById(
            "todayAttendanceStatus"
        );



    if (!message || !statusElement) {
        return;
    }



    message.innerText =
        "Saving today's attendance...";

    message.style.color =
        "#b8860b";



    try {

        const {
            data: userData,
            error: userError
        } = await supabase.auth.getUser();



        if (
            userError ||
            !userData ||
            !userData.user
        ) {

            message.innerText =
                "Please login again.";

            message.style.color =
                "#cc0000";

            return;
        }



        const userId =
            userData.user.id;



        const today =
            getLocalDateString();



        const {
            data: existing,
            error: checkError
        } = await supabase
            .from("Attendance")
            .select("id, present")
            .eq("user_id", userId)
            .eq("attendance_date", today);



        if (checkError) {

            console.error(
                checkError
            );

            message.innerText =
                "Unable to check today's attendance.";

            message.style.color =
                "#cc0000";

            return;
        }



        if (
            existing &&
            existing.length > 0
        ) {

            const {
                error: updateError
            } = await supabase
                .from("Attendance")
                .update({
                    present: present
                })
                .eq("id", existing[0].id)
                .eq("user_id", userId);



            if (updateError) {

                console.error(
                    updateError
                );

                message.innerText =
                    "Failed to update today's attendance.";

                message.style.color =
                    "#cc0000";

                return;
            }

        }

        else {

            const {
                error: insertError
            } = await supabase
                .from("Attendance")
                .insert({

                    user_id: userId,

                    attendance_date: today,

                    present: present

                });



            if (insertError) {

                console.error(
                    insertError
                );

                message.innerText =
                    "Failed to save today's attendance.";

                message.style.color =
                    "#cc0000";

                return;
            }

        }



        if (present) {

            message.innerText =
                "✓ Today's attendance marked Present.";

            message.style.color =
                "#008000";

            statusElement.innerText =
                "Today's Status: Present";

            statusElement.className =
                "today-present";

        }
        else {

            message.innerText =
                "Today's attendance marked Absent.";

            message.style.color =
                "#cc0000";

            statusElement.innerText =
                "Today's Status: Absent";

            statusElement.className =
                "today-absent";

        }



        await loadMyAttendance();

    }

    catch (error) {

        console.error(
            "Student attendance error:",
            error
        );

        message.innerText =
            "Unexpected error: " +
            error.message;

        message.style.color =
            "#cc0000";

    }

}



// =========================================
// LOAD STUDENT ATTENDANCE
// =========================================

async function loadMyAttendance() {

    const history =
        document.getElementById(
            "attendanceHistory"
        );

    const percentage =
        document.getElementById(
            "attendancePercentage"
        );

    const total =
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

    const todayStatus =
        document.getElementById(
            "todayAttendanceStatus"
        );



    if (
        !history ||
        !percentage ||
        !total ||
        !presentDays ||
        !absentDays
    ) {
        return;
    }



    history.innerText =
        "Loading attendance...";



    try {

        const {
            data: userData,
            error: userError
        } = await supabase.auth.getUser();



        if (
            userError ||
            !userData ||
            !userData.user
        ) {

            history.innerText =
                "Unable to get student information.";

            return;
        }



        const userId =
            userData.user.id;



        const {
            data: attendance,
            error
        } = await supabase
            .from("Attendance")
            .select(
                "attendance_date, present"
            )
            .eq("user_id", userId)
            .order(
                "attendance_date",
                {
                    ascending: false
                }
            );



        if (error) {

            history.innerText =
                "Error loading attendance: " +
                error.message;

            return;
        }



        const records =
            attendance || [];



        // =========================================
        // TODAY'S STATUS
        // =========================================

        const today =
            getLocalDateString();



        const todayRecord =
            records.find(
                record =>
                    record.attendance_date === today
            );



        if (todayStatus) {

            if (!todayRecord) {

                todayStatus.innerText =
                    "Today's Status: Not Marked";

                todayStatus.className =
                    "today-not-marked";

            }
            else if (
                todayRecord.present === true
            ) {

                todayStatus.innerText =
                    "Today's Status: Present";

                todayStatus.className =
                    "today-present";

            }
            else {

                todayStatus.innerText =
                    "Today's Status: Absent";

                todayStatus.className =
                    "today-absent";

            }

        }



        // =========================================
        // CURRENT MONTH
        // =========================================

        const now =
            new Date();

        const currentYear =
            now.getFullYear();

        const currentMonth =
            String(
                now.getMonth() + 1
            ).padStart(2, "0");



        const monthStart =
            currentYear +
            "-" +
            currentMonth +
            "-01";



        const nextMonth =
            new Date(
                currentYear,
                now.getMonth() + 1,
                1
            );



        const nextMonthStart =
            nextMonth.getFullYear() +
            "-" +
            String(
                nextMonth.getMonth() + 1
            ).padStart(2, "0") +
            "-01";



        const monthRecords =
            records.filter(
                record =>
                    record.attendance_date >= monthStart &&
                    record.attendance_date < nextMonthStart
            );



        const totalCount =
            monthRecords.length;



        let presentCount = 0;



        monthRecords.forEach(record => {

            if (record.present === true) {
                presentCount++;
            }

        });



        const absentCount =
            totalCount -
            presentCount;



        const attendancePercentage =
            totalCount === 0
                ? 0
                : (
                    presentCount /
                    totalCount
                ) * 100;



        total.innerText =
            "Total Days: " +
            totalCount;



        presentDays.innerText =
            "Present: " +
            presentCount;



        absentDays.innerText =
            "Absent: " +
            absentCount;



        percentage.innerText =
            "Attendance: " +
            attendancePercentage.toFixed(1) +
            "%";



        // =========================================
        // DAILY HISTORY
        // =========================================

        if (records.length === 0) {

            history.innerText =
                "No attendance records found.";

            return;
        }



        history.innerHTML = "";



        records.forEach(record => {

            const row =
                document.createElement("p");



            const status =
                record.present === true
                    ? "Present"
                    : "Absent";



            row.innerText =
                record.attendance_date +
                " — " +
                status;



            row.className =
                record.present === true
                    ? "present-status"
                    : "absent-status";



            history.appendChild(row);

        });

    }

    catch (error) {

        console.error(
            "Student attendance loading error:",
            error
        );

        history.innerText =
            "Unexpected error: " +
            error.message;

    }

}



// =========================================
// INITIAL PAGE
// =========================================

document.addEventListener(
    "DOMContentLoaded",
    () => {

        console.log(
            "Mission Fajr JavaScript loaded successfully."
        );

    }
);
