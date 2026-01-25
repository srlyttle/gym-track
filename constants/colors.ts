export const colors = {
  primary: {
    50: "#ecfdf5",
    100: "#d1fae5",
    200: "#a7f3d0",
    300: "#6ee7b7",
    400: "#34d399",
    500: "#10b981",
    600: "#059669",
    700: "#047857",
    800: "#065f46",
    900: "#064e3b",
  },
  slate: {
    50: "#f8fafc",
    100: "#f1f5f9",
    200: "#e2e8f0",
    300: "#cbd5e1",
    400: "#94a3b8",
    500: "#64748b",
    600: "#475569",
    700: "#334155",
    800: "#1e293b",
    900: "#0f172a",
  },
};

export const lightTheme = {
  background: colors.slate[50],
  surface: "#ffffff",
  surfaceVariant: colors.slate[100],
  text: colors.slate[900],
  textSecondary: colors.slate[500],
  border: colors.slate[200],
  primary: colors.primary[500],
  primaryContainer: colors.primary[100],
};

export const darkTheme = {
  background: colors.slate[900],
  surface: colors.slate[800],
  surfaceVariant: colors.slate[700],
  text: colors.slate[50],
  textSecondary: colors.slate[400],
  border: colors.slate[700],
  primary: colors.primary[500],
  primaryContainer: colors.primary[900],
};
