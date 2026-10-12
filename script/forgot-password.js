import { resetPassword } from "./supabase.js";
import { showToast } from "./toast.js";

document.addEventListener("DOMContentLoaded", () => {
    const forgotForm = document.getElementById("forgot-password-form");

    forgotForm?.addEventListener("submit", async (e) => {
        e.preventDefault();

        const email = document.getElementById("email").value;

        // Visual feedback
        const submitBtn = forgotForm.querySelector('button[type="submit"]');
        const originalText = submitBtn.innerHTML;
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Sending Link...';

        try {
            const { data, error } = await resetPassword(email);

            if (error) {
                console.error("Reset Error:", error);
                showToast("Error: " + error.message, "error");
                submitBtn.disabled = false;
                submitBtn.innerHTML = originalText;
                return;
            }

            showToast("Success! A reset link has been sent to your email. 📧", "success");
            
            // Clear the form
            forgotForm.reset();
            
            // Optionally redirect back to login after a delay
            setTimeout(() => {
                window.location.href = "login.html";
            }, 3000);

        } catch (err) {
            console.error("Critical Reset Error:", err);
            showToast("A critical error occurred: " + err.message, "error");
            submitBtn.disabled = false;
            submitBtn.innerHTML = originalText;
        }
    });
});
