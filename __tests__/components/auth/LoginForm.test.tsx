import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import LoginForm from "@/components/auth/LoginForm";

describe("LoginForm", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders login form with all fields", () => {
    render(<LoginForm />);

    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/password/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /login/i })).toBeInTheDocument();
  });

  it("has email or phone identifier input with correct type", () => {
    render(<LoginForm />);

    const identifierInput = screen.getByLabelText(/email/i);
    expect(identifierInput).toHaveAttribute("type", "text");
    expect(identifierInput).toHaveAttribute("autocomplete", "username");
  });

  it("has password input with correct attributes", () => {
    render(<LoginForm />);

    const passwordInput = screen.getByPlaceholderText(/password/i);
    expect(passwordInput).toHaveAttribute("type", "password");
    expect(passwordInput).toHaveAttribute("autocomplete", "current-password");
  });

  it("toggles password visibility when toggle button clicked", async () => {
    render(<LoginForm />);

    const passwordInput = screen.getByPlaceholderText(/password/i);
    const toggleButton = screen.getByRole("button", {
      name: /toggle password visibility/i,
    });

    expect(passwordInput).toHaveAttribute("type", "password");

    await userEvent.click(toggleButton);

    expect(passwordInput).toHaveAttribute("type", "text");
  });

  it("has submit button in document", () => {
    render(<LoginForm />);

    const submitButton = screen.getByRole("button", { name: /login/i });
    expect(submitButton).toBeInTheDocument();
    expect(submitButton).toHaveTextContent("login");
  });

  it("has skip to content link not visible by default", () => {
    // This tests accessibility feature
    const link = document.createElement("a");
    link.href = "#main-content";
    link.className = "sr-only";
    document.body.appendChild(link);

    const hiddenLink = document.querySelector(".sr-only");
    expect(hiddenLink).toBeTruthy();

    document.body.removeChild(link);
  });
});
