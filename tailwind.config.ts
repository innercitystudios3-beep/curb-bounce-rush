import type { Config } from "tailwindcss";

export default {
  darkMode: ["class"],
  content: ["./pages/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./app/**/*.{ts,tsx}", "./src/**/*.{ts,tsx}"],
  prefix: "",
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        sidebar: {
          DEFAULT: "hsl(var(--sidebar-background))",
          foreground: "hsl(var(--sidebar-foreground))",
          primary: "hsl(var(--sidebar-primary))",
          "primary-foreground": "hsl(var(--sidebar-primary-foreground))",
          accent: "hsl(var(--sidebar-accent))",
          "accent-foreground": "hsl(var(--sidebar-accent-foreground))",
          border: "hsl(var(--sidebar-border))",
          ring: "hsl(var(--sidebar-ring))",
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
        "ball-throw": {
          "0%": { transform: "translateY(0) scale(1)" },
          "50%": { transform: "translateY(-300px) scale(0.8)" },
          "100%": { transform: "translateY(0) scale(1)" },
        },
        "car-move": {
          "0%": { transform: "translateX(-100%)" },
          "100%": { transform: "translateX(100vw)" },
        },
        "confetti-fall": {
          "0%": { transform: "translateY(-100vh) rotate(0deg)", opacity: "1" },
          "100%": { transform: "translateY(100vh) rotate(720deg)", opacity: "0" },
        },
        "pulse-glow": {
          "0%, 100%": { boxShadow: "0 0 20px hsl(var(--primary) / 0.5)" },
          "50%": { boxShadow: "0 0 40px hsl(var(--primary) / 0.8)" },
        },
        "bounce-in": {
          "0%": { transform: "scale(0)", opacity: "0" },
          "50%": { transform: "scale(1.2)" },
          "100%": { transform: "scale(1)", opacity: "1" },
        },
        "fire-flicker": {
          "0%, 100%": {
            transform: "translate(-50%, 0) scaleY(1) scaleX(1)",
            opacity: "0.85",
            filter: "blur(2px) hue-rotate(0deg)",
          },
          "25%": {
            transform: "translate(-52%, -4px) scaleY(1.15) scaleX(0.9)",
            opacity: "1",
            filter: "blur(2px) hue-rotate(-8deg)",
          },
          "50%": {
            transform: "translate(-48%, -2px) scaleY(0.9) scaleX(1.1)",
            opacity: "0.9",
            filter: "blur(3px) hue-rotate(6deg)",
          },
          "75%": {
            transform: "translate(-51%, -5px) scaleY(1.2) scaleX(0.95)",
            opacity: "1",
            filter: "blur(2px) hue-rotate(-4deg)",
          },
        },
        "fire-glow": {
          "0%, 100%": {
            boxShadow:
              "0 0 18px 4px rgba(255,140,0,0.7), 0 0 36px 10px rgba(255,69,0,0.45)",
          },
          "50%": {
            boxShadow:
              "0 0 28px 8px rgba(255,180,40,0.9), 0 0 60px 18px rgba(255,69,0,0.6)",
          },
        },
        "ember-rise": {
          "0%": { transform: "translate(-50%, 0) scale(1)", opacity: "0" },
          "20%": { opacity: "1" },
          "100%": {
            transform: "translate(calc(-50% + var(--ember-x, 0px)), -60px) scale(0.3)",
            opacity: "0",
          },
        },
        "ball-wobble": {
          "0%, 100%": { transform: "rotate(-3deg)" },
          "50%": { transform: "rotate(3deg)" },
        },
        "screen-shake": {
          "0%, 100%": { transform: "translate(0, 0) rotate(0deg)" },
          "10%": { transform: "translate(-6px, -4px) rotate(-0.4deg)" },
          "20%": { transform: "translate(7px, 3px) rotate(0.5deg)" },
          "30%": { transform: "translate(-5px, 5px) rotate(-0.3deg)" },
          "40%": { transform: "translate(6px, -3px) rotate(0.4deg)" },
          "50%": { transform: "translate(-4px, 4px) rotate(-0.2deg)" },
          "60%": { transform: "translate(5px, -2px) rotate(0.3deg)" },
          "70%": { transform: "translate(-3px, 3px) rotate(-0.2deg)" },
          "80%": { transform: "translate(2px, -2px) rotate(0.1deg)" },
          "90%": { transform: "translate(-1px, 1px) rotate(0deg)" },
        },
        "heat-wave": {
          "0%, 100%": { opacity: "0.85", transform: "scale(1)" },
          "50%": { opacity: "1", transform: "scale(1.06)" },
        },
        "trail-fade": {
          "0%": { opacity: "0.9", transform: "translate(-50%, 50%) scale(1)" },
          "100%": { opacity: "0", transform: "translate(-50%, 50%) scale(0.3)" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        "ball-throw": "ball-throw 1.5s var(--transition-bounce)",
        "car-move": "car-move 4s linear infinite",
        "confetti-fall": "confetti-fall 3s linear forwards",
        "pulse-glow": "pulse-glow 2s ease-in-out infinite",
        "bounce-in": "bounce-in 0.5s var(--transition-bounce)",
        "fire-flicker": "fire-flicker 0.45s ease-in-out infinite",
        "fire-glow": "fire-glow 1.2s ease-in-out infinite",
        "ember-rise": "ember-rise 1.4s ease-out infinite",
        "ball-wobble": "ball-wobble 0.6s ease-in-out infinite",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
} satisfies Config;
