import { updatePassword } from "./supabase.js";
import { showToast } from "./toast.js";

document.addEventListener("DOMContentLoaded", () => {
    const resetForm = document.getElementById("reset-password-form");
    const togglePassword = document.getElementById("toggle-password");
    const passwordInput = document.getElementById("password-input-field");
    const confirmInput = document.getElementById("confirm-password");

    // Toggle password visibility
    togglePassword?.addEventListener("click", () => {
        const type = passwordInput.getAttribute("type") === "password" ? "text" : "password";
        passwordInput.setAttribute("type", type);
        togglePassword.classList.toggle("fa-eye");
        togglePassword.classList.toggle("fa-eye-slash");
    });

    resetForm?.addEventListener("submit", async (e) => {
        e.preventDefault();

        const password = passwordInput.value;
        const confirmPassword = confirmInput.value;

        if (password !== confirmPassword) {
            showToast("Passwords do not match!", "error");
            return;
        }

        // Visual feedback
        const submitBtn = resetForm.querySelector('button[type="submit"]');
        const originalText = submitBtn.innerHTML;
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Updating...';

        try {
            const { data, error } = await updatePassword(password);

            if (error) {
                console.error("Update Error:", error);
                showToast("Error: " + error.message, "error");
                submitBtn.disabled = false;
                submitBtn.innerHTML = originalText;
                return;
            }

            showToast("Password updated successfully! Redirecting to login...", "success");
            
            // Redirect to login after success
            setTimeout(() => {
                window.location.href = "login.html";
            }, 2000);

        } catch (err) {
            console.error("Critical Update Error:", err);
            showToast("A critical error occurred: " + err.message, "error");
            submitBtn.disabled = false;
            submitBtn.innerHTML = originalText;
        }
    });
});
