export function getPasswordStrength(password: string): {
  score: number;
  level: "weak" | "fair" | "strong" | "very strong";
  feedback: string;
  isValid: boolean;
} {
  let score = 0;
  const feedback: string[] = [];

  // Minimum length check
  if (password.length >= 8) {
    score += 1;
  } else {
    feedback.push("At least 8 characters");
  }

  if (password.length >= 12) {
    score += 1;
  }

  // Uppercase letters
  if (/[A-Z]/.test(password)) {
    score += 1;
  } else {
    feedback.push("Add uppercase letters");
  }

  // Lowercase letters
  if (/[a-z]/.test(password)) {
    score += 1;
  } else {
    feedback.push("Add lowercase letters");
  }

  // Numbers
  if (/[0-9]/.test(password)) {
    score += 1;
  } else {
    feedback.push("Add numbers");
  }

  // Special characters
  if (/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
    score += 1;
  } else {
    feedback.push("Add special characters (!@#$%^&* etc)");
  }

  // Determine level
  let level: "weak" | "fair" | "strong" | "very strong" = "weak";
  if (score <= 2) {
    level = "weak";
  } else if (score <= 3) {
    level = "fair";
  } else if (score <= 4) {
    level = "strong";
  } else {
    level = "very strong";
  }

  const isValid = password.length >= 8;

  return {
    score: Math.min(score, 6),
    level,
    feedback: feedback.slice(0, 2).join(" • ") || "Great password!",
    isValid,
  };
}

export function PasswordStrengthIndicator({
  password,
  showFeedback = true,
}: {
  password: string;
  showFeedback?: boolean;
}) {
  if (!password) return null;

  const { score, level, feedback } = getPasswordStrength(password);
  const colors = {
    weak: "bg-destructive",
    fair: "bg-yellow-500",
    strong: "bg-blue-500",
    "very strong": "bg-success",
  };
  const textColors = {
    weak: "text-destructive",
    fair: "text-yellow-600",
    strong: "text-blue-600",
    "very strong": "text-success",
  };

  return (
    <div className="mt-2 space-y-2">
      <div className="flex items-center gap-2">
        <div className="flex-1 h-2 bg-secondary rounded-full overflow-hidden">
          <div
            className={`h-full ${colors[level]} transition-all duration-300`}
            style={{ width: `${(score / 6) * 100}%` }}
          />
        </div>
        <span className={`text-xs font-semibold capitalize ${textColors[level]}`}>
          {level}
        </span>
      </div>
      {showFeedback && feedback && (
        <p className="text-xs text-muted-foreground">{feedback}</p>
      )}
    </div>
  );
}
