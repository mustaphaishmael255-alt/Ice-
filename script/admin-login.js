import { signInUser } from "./supabase.js";
import { showToast } from "./toast.js";

// Default admin credentials (stored in localStorage for settings)
const DEFAULT_ADMIN_EMAIL = "mechbig0@gmail.com";
const DEFAULT_ADMIN_PASSWORD = "Qwerty123!";

document.addEventListener("DOMContentLoaded", () => {
    const loginForm = document.getElementById("admin-login-form");
    const togglePassword = document.getElementById("toggle-password");
    const passwordInput = document.getElementById("password-input-field");

    // Toggle password visibility
    togglePassword?.addEventListener("click", () => {
        const type = passwordInput.getAttribute("type") === "password" ? "text" : "password";
        passwordInput.setAttribute("type", type);
        togglePassword.classList.toggle("fa-eye");
        togglePassword.classList.toggle("fa-eye-slash");
    });

    // 1-Click Demo Vendor Login (Judging & Presentation)
    const demoVendorBtn = document.getElementById("demo-vendor-btn");
    demoVendorBtn?.addEventListener("click", () => {
        showToast("Logging in as East Legon Parlour Vendor...", "success");
        localStorage.setItem("Yah!_user", JSON.stringify({
            email: "vendor@sweetscoops.com",
            id: "vendor-sweet-scoops",
            fullName: "Sweet Scoops Parlour Manager",
            isAdmin: true,
            isVendor: true
        }));
        setTimeout(() => {
            window.location.href = "admin.html";
        }, 500);
    });

    loginForm?.addEventListener("submit", async (e) => {
        e.preventDefault();

        const email = document.getElementById("email").value.trim();
        const password = passwordInput.value.trim();

        if (!email || !password) {
            showToast("Please fill in all fields.", "error");
            return;
        }

        const submitBtn = loginForm.querySelector("button[type='submit']");
        const originalText = submitBtn.innerHTML;
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Authenticating...';

        try {
            // Check if credentials match default or stored admin credentials
            const storedAdminEmail = localStorage.getItem("Yah!_admin_email") || DEFAULT_ADMIN_EMAIL;
            const storedAdminPassword = localStorage.getItem("Yah!_admin_password") || DEFAULT_ADMIN_PASSWORD;

            if ((email === storedAdminEmail || email === "admin@yah.com") && (password === storedAdminPassword || password === "Qwerty123!")) {
                // Direct login with stored/default credentials
                console.log("Admin login success with stored credentials");
                localStorage.setItem("Yah!_user", JSON.stringify({ 
                    email: email,
                    id: "admin-default",
                    fullName: "Sweet Scoops Parlour Manager",
                    isAdmin: true
                }));
                window.location.href = "admin.html";
                return;
            }

            // Try Supabase authentication as fallback
            const { data, error } = await signInUser(email, password);
            const user = data?.user;

            if (error) {
                if (error.message.includes("Invalid login credentials")) {
                    showToast("Invalid email or password.", "error");
                } else if (error.message.includes("Email not confirmed")) {
                    showToast("Please confirm your email first.", "error");
                } else {
                    showToast(error.message, "error");
                }
                submitBtn.disabled = false;
                submitBtn.innerHTML = originalText;
                return;
            }

            if (user) {
                // Verify this is an admin user
                if (!user.email.toLowerCase().includes("admin")) {
                    showToast("Access denied. Admin access only.", "error");
                    submitBtn.disabled = false;
                    submitBtn.innerHTML = originalText;
                    return;
                }

                console.log("Admin login success:", user);
                // Success - save admin user data
                localStorage.setItem("Yah!_user", JSON.stringify({ 
                    email: user.email,
                    id: user.id,
                    fullName: user.user_metadata?.full_name || user.email.split('@')[0],
                    isAdmin: true
                }));
                
                // Redirect to admin portal only
                window.location.href = "admin.html";
            } else {
                showToast("Login failed: No user data returned.", "error");
                submitBtn.disabled = false;
                submitBtn.innerHTML = originalText;
            }
        } catch (err) {
            console.error("Critical Login Error:", err);
            
            // Check for specific "Failed to fetch" error
            if (err.message === "Failed to fetch" || err.name === "TypeError") {
                showToast("Network Error: Could not reach login server. Please disable any Ad-blockers and try again.", "error");
                console.warn("TIP: This error usually means an ad-blocker or firewall is blocking 'supabase.co'. Try an Incognito window.");
            } else {
                showToast("A critical error occurred: " + err.message, "error");
            }
            
            submitBtn.disabled = false;
            submitBtn.innerHTML = originalText;
        }
    });
});
