const EmophoraConfig = {
  app: {
    name: "Emphora",
    tagline: "Your Professional Intelligence Platform",
    logoText: "emphora",
    version: "1.0.0",
    defaultTheme: "light",
    defaultView: "login"
  },

  server: {
    port: 5001,          // preferred port; server auto-increments if already in use
    portFallbackTries: 10  // how many ports to try before giving up
  },

  accountTag: {
    show: true,
    defaultType: "employee",
    types: {
      employee:   { label: "Employee",   icon: "badge",    colorClass: "em-tag--employee"   },
      employer:   { label: "Employer",   icon: "business", colorClass: "em-tag--employer"   },
      researcher: { label: "Researcher", icon: "science",  colorClass: "em-tag--researcher" }
    }
  },

  theme: {
    light: {
      label: "Light Mode",
      icon: "light_mode"
    },
    dark: {
      label: "Dark Mode",
      icon: "dark_mode"
    }
  },

  events: {
    login:        "emphora:login",
    register:     "emphora:register",
    logout:       "emphora:logout",
    themeChange:  "emphora:themeChange"
  },

  api: {
    baseUrl: "/api",
    endpoints: {
      login:    "/auth/login",
      register: "/auth/register",
      logout:   "/auth/logout",
      profile:  "/user/profile"
    }
  },

  login: {
    heading:     "Welcome back",
    subheading:  "Sign in to your account",
    submitLabel: "Sign In",
    fields: [
      {
        id:          "login-email",
        name:        "email",
        type:        "email",
        label:       "Email address",
        placeholder: "you@example.com",
        icon:        "mail",
        required:    true,
        autocomplete:"email"
      },
      {
        id:          "login-password",
        name:        "password",
        type:        "password",
        label:       "Password",
        placeholder: "Enter your password",
        icon:        "lock",
        required:    true,
        autocomplete:"current-password",
        toggleable:  true
      }
    ],
    forgotPassword: {
      show:  true,
      label: "Forgot password?"
    },
    switchPrompt: {
      text:   "Don't have an account?",
      label:  "Create one",
      target: "register"
    },
    validation: {
      email:    { required: true, pattern: "^[^@\\s]+@[^@\\s]+\\.[^@\\s]+$", message: "Please enter a valid email address." },
      password: { required: true, minLength: 6, message: "Password must be at least 6 characters." }
    }
  },

  register: {
    heading:     "Create account",
    subheading:  "Join Emphora — your eLifeBook™ awaits",
    submitLabel: "Create Account",
    fields: [
      {
        id:          "reg-firstname",
        name:        "firstName",
        type:        "text",
        label:       "First name",
        placeholder: "First name",
        icon:        "person",
        required:    true,
        autocomplete:"given-name"
      },
      {
        id:          "reg-lastname",
        name:        "lastName",
        type:        "text",
        label:       "Last name",
        placeholder: "Last name",
        icon:        "person",
        required:    true,
        autocomplete:"family-name"
      },
      {
        id:          "reg-email",
        name:        "email",
        type:        "email",
        label:       "Email address",
        placeholder: "you@example.com",
        icon:        "mail",
        required:    true,
        autocomplete:"email"
      },
      {
        id:          "reg-password",
        name:        "password",
        type:        "password",
        label:       "Password",
        placeholder: "Create a password",
        icon:        "lock",
        required:    true,
        autocomplete:"new-password",
        toggleable:  true
      },
      {
        id:          "reg-confirm",
        name:        "confirmPassword",
        type:        "password",
        label:       "Confirm password",
        placeholder: "Repeat your password",
        icon:        "lock_reset",
        required:    true,
        autocomplete:"new-password",
        toggleable:  true
      }
    ],
    accountType: {
      show:    true,
      label:   "I am joining as a",
      options: [
        { value: "employee",   label: "Professional / Job Seeker", icon: "badge"    },
        { value: "employer",   label: "Employer / Recruiter",      icon: "business" },
        { value: "researcher", label: "Researcher / Analyst",      icon: "science"  }
      ]
    },
    terms: {
      show:   true,
      text:   "I agree to the",
      label:  "Terms of Service & Privacy Policy",
      href:   "#terms"
    },
    switchPrompt: {
      text:   "Already have an account?",
      label:  "Sign in",
      target: "login"
    },
    validation: {
      firstName:       { required: true, minLength: 2,  message: "First name must be at least 2 characters." },
      lastName:        { required: true, minLength: 2,  message: "Last name must be at least 2 characters." },
      email:           { required: true, pattern: "^[^@\\s]+@[^@\\s]+\\.[^@\\s]+$", message: "Please enter a valid email address." },
      password:        { required: true, minLength: 8,  message: "Password must be at least 8 characters." },
      confirmPassword: { required: true, mustMatch: "password", message: "Passwords do not match." },
      terms:           { required: true, message: "You must accept the terms to continue." }
    }
  },

  toast: {
    duration:  3800,
    position:  "bottom-center",
    messages: {
      loginSuccess:    "Welcome back! You're now signed in.",
      loginError:      "Invalid email or password. Please try again.",
      registerSuccess: "Account created! Welcome to Emphora.",
      registerError:   "Registration failed. Please try again.",
      networkError:    "Network error. Check your connection.",
      logoutSuccess:   "You've been signed out."
    }
  },

  a11y: {
    liveRegionId: "emphora-live-region"
  }
};

if (typeof module !== "undefined" && module.exports) {
  module.exports = EmophoraConfig;
}
