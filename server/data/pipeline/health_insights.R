# ============================================================================
# Additional Health Insights and Pattern Analysis
# Njala University Njala Campus Hospital
# ============================================================================

# Load required libraries
if (!require("dplyr")) install.packages("dplyr")
if (!require("ggplot2")) install.packages("ggplot2")
if (!require("readr")) install.packages("readr")
if (!require("corrplot")) install.packages("corrplot")
if (!require("tidyr")) install.packages("tidyr")

library(dplyr)
library(ggplot2)
library(readr)
library(corrplot)
library(tidyr)

# Load the enhanced dataset with health scores
if (file.exists("student_welfare_with_scores.csv")) {
  data <- read_csv("student_welfare_with_scores.csv")
} else {
  # If main script hasn't been run, load original and calculate scores
  source("student_health_analysis.R")
  data <- read_csv("student_welfare_with_scores.csv")
}

# ============================================================================
# 1. VISIT FREQUENCY PATTERNS
# ============================================================================

cat("\n=== VISIT FREQUENCY ANALYSIS ===\n\n")

visit_analysis <- data %>%
  group_by(`Student ID`, `Full Name`) %>%
  summarise(
    Total_Visits = first(`Total Visits (lifetime)`),
    Avg_Days_Between = first(`Average Days Between Visits`),
    Emergency_Visits = sum(`Is Emergency` == "Yes", na.rm = TRUE),
    Avg_Health_Score = mean(composite_health_score, na.rm = TRUE),
    .groups = "drop"
  )

print(visit_analysis)

# Visit frequency vs health score correlation
if (nrow(visit_analysis) > 1) {
  cor_visits_health <- cor(visit_analysis$Total_Visits, 
                           visit_analysis$Avg_Health_Score, 
                           use = "complete.obs")
  cat("\nCorrelation between Visit Frequency and Health Score:", 
      round(cor_visits_health, 3), "\n")
}

# ============================================================================
# 2. DISEASE PATTERN ANALYSIS
# ============================================================================

cat("\n=== DISEASE PATTERN ANALYSIS ===\n\n")

disease_analysis <- data %>%
  group_by(Diagnosis) %>%
  summarise(
    Count = n(),
    Avg_Triage_Level = mean(case_when(
      `Triage Level` == "Green" ~ 1,
      `Triage Level` == "Yellow" ~ 2,
      `Triage Level` == "Red" ~ 3,
      TRUE ~ 1.5
    ), na.rm = TRUE),
    Emergency_Rate = mean(`Is Emergency` == "Yes", na.rm = TRUE) * 100,
    Avg_Recovery_Time = mean(`Recovery Time (days)`, na.rm = TRUE),
    .groups = "drop"
  ) %>%
  arrange(desc(Count))

print(disease_analysis)

# Top diagnoses visualization
if (nrow(disease_analysis) > 0) {
  p1 <- ggplot(disease_analysis, aes(x = reorder(Diagnosis, Count), y = Count)) +
    geom_col(fill = "steelblue", alpha = 0.7) +
    coord_flip() +
    labs(title = "Most Common Diagnoses",
         x = "Diagnosis", y = "Number of Cases") +
    theme_minimal()
  
  if (!dir.exists("plots")) dir.create("plots")
  ggsave("plots/disease_patterns.png", p1, width = 10, height = 6)
}

# ============================================================================
# 3. TREATMENT COMPLIANCE METRICS
# ============================================================================

cat("\n=== TREATMENT COMPLIANCE ANALYSIS ===\n\n")

compliance_analysis <- data %>%
  summarise(
    Total_Prescriptions = sum(!is.na(Prescriptions) & Prescriptions != "", na.rm = TRUE),
    Dispensed_Rate = mean(`Prescription Status` == "Dispensed", na.rm = TRUE) * 100,
    Lab_Test_Completion = mean(`Lab Test Status` == "Completed", na.rm = TRUE) * 100,
    Follow_up_Completion = mean(`Follow-up Visit Completed` == "Yes", na.rm = TRUE) * 100,
    Avg_Compliance_Score = mean(compliance_score, na.rm = TRUE)
  )

print(compliance_analysis)

# Compliance by student
compliance_by_student <- data %>%
  group_by(`Student ID`, `Full Name`) %>%
  summarise(
    Prescription_Compliance = mean(`Prescription Status` == "Dispensed", na.rm = TRUE) * 100,
    Lab_Test_Compliance = mean(`Lab Test Status` == "Completed", na.rm = TRUE) * 100,
    Follow_up_Compliance = mean(`Follow-up Visit Completed` == "Yes", na.rm = TRUE) * 100,
    Avg_Compliance_Score = mean(compliance_score, na.rm = TRUE),
    .groups = "drop"
  )

cat("\nCompliance by Student:\n")
print(compliance_by_student)

# ============================================================================
# 4. RISK STRATIFICATION
# ============================================================================

cat("\n=== RISK STRATIFICATION ===\n\n")

# Categorize students by risk level
risk_stratification <- data %>%
  group_by(`Student ID`, `Full Name`) %>%
  summarise(
    Composite_Score = mean(composite_health_score, na.rm = TRUE),
    Mental_Health_Score = mean(mental_health_score, na.rm = TRUE),
    Chronic_Conditions = first(`Existing Conditions`),
    Visit_Frequency = first(`Total Visits (lifetime)`),
    Emergency_Rate = mean(`Is Emergency` == "Yes", na.rm = TRUE),
    .groups = "drop"
  ) %>%
  mutate(
    Risk_Level = case_when(
      Composite_Score >= 8 & Mental_Health_Score >= 7 & 
      is.na(Chronic_Conditions) | Chronic_Conditions == "" ~ "Low Risk",
      Composite_Score >= 6 & Mental_Health_Score >= 5 ~ "Moderate Risk",
      Composite_Score < 6 | Mental_Health_Score < 5 | 
      (!is.na(Chronic_Conditions) & Chronic_Conditions != "") ~ "High Risk",
      TRUE ~ "Moderate Risk"
    )
  )

print(risk_stratification)

# Risk level distribution
risk_distribution <- risk_stratification %>%
  count(Risk_Level) %>%
  mutate(Percentage = n / sum(n) * 100)

cat("\nRisk Level Distribution:\n")
print(risk_distribution)

# ============================================================================
# 5. MENTAL HEALTH CORRELATIONS
# ============================================================================

cat("\n=== MENTAL HEALTH CORRELATIONS ===\n\n")

mental_health_correlations <- data %>%
  select(
    `Mental Health PHQ-9 Score`,
    `Mental Health GAD-7 Score`,
    `Stress Level (1-10)`,
    `Sleep Quality (1-10)`,
    `Academic GPA`,
    `Exam Stress Level (1-10)`,
    `Study Hours Per Week`,
    `Class Attendance Rate (%)`,
    mental_health_score
  ) %>%
  cor(use = "complete.obs")

cat("Mental Health Correlation Matrix:\n")
print(round(mental_health_correlations, 3))

# Visualization
if (!dir.exists("plots")) dir.create("plots")
png("plots/mental_health_correlations.png", width = 1000, height = 1000)
corrplot(mental_health_correlations, method = "color", type = "upper",
         order = "hclust", tl.cex = 0.8, tl.col = "black")
dev.off()

# ============================================================================
# 6. ACADEMIC PERFORMANCE VS HEALTH
# ============================================================================

cat("\n=== ACADEMIC PERFORMANCE VS HEALTH ANALYSIS ===\n\n")

academic_health <- data %>%
  group_by(`Student ID`, `Full Name`) %>%
  summarise(
    GPA = first(`Academic GPA`),
    Course_Load = first(`Academic Course Load`),
    Attendance = first(`Class Attendance Rate (%)`),
    Exam_Stress = first(`Exam Stress Level (1-10)`),
    Study_Hours = first(`Study Hours Per Week`),
    Health_Score = mean(composite_health_score, na.rm = TRUE),
    Mental_Health = mean(mental_health_score, na.rm = TRUE),
    .groups = "drop"
  )

print(academic_health)

# Correlation analysis
if (nrow(academic_health) > 1) {
  cor_gpa_health <- cor(academic_health$GPA, academic_health$Health_Score, 
                        use = "complete.obs")
  cor_attendance_health <- cor(academic_health$Attendance, academic_health$Health_Score, 
                              use = "complete.obs")
  cor_stress_health <- cor(academic_health$Exam_Stress, academic_health$Mental_Health, 
                          use = "complete.obs")
  
  cat("\nCorrelations:\n")
  cat("GPA vs Health Score:", round(cor_gpa_health, 3), "\n")
  cat("Attendance vs Health Score:", round(cor_attendance_health, 3), "\n")
  cat("Exam Stress vs Mental Health:", round(cor_stress_health, 3), "\n")
}

# Visualization
p2 <- ggplot(academic_health, aes(x = GPA, y = Health_Score)) +
  geom_point(aes(size = Attendance, color = Exam_Stress), alpha = 0.7) +
  geom_smooth(method = "lm", se = TRUE) +
  labs(title = "Academic Performance vs Health Score",
       x = "GPA", y = "Composite Health Score",
       size = "Attendance %", color = "Exam Stress") +
  theme_minimal()

ggsave("plots/academic_vs_health.png", p2, width = 10, height = 6)

# ============================================================================
# 7. LIFESTYLE FACTORS ANALYSIS
# ============================================================================

cat("\n=== LIFESTYLE FACTORS ANALYSIS ===\n\n")

lifestyle_analysis <- data %>%
  group_by(`Student ID`, `Full Name`) %>%
  summarise(
    BMI = first(BMI),
    Physical_Activity = first(`Physical Activity Level (days/week)`),
    Meal_Frequency = first(`Meal Frequency (meals/day)`),
    Dietary_Habits = first(`Dietary Habits Assessment`),
    Lifestyle_Score = mean(lifestyle_score, na.rm = TRUE),
    Health_Score = mean(composite_health_score, na.rm = TRUE),
    .groups = "drop"
  )

print(lifestyle_analysis)

# Lifestyle vs health correlation
if (nrow(lifestyle_analysis) > 1) {
  cor_lifestyle_health <- cor(lifestyle_analysis$Lifestyle_Score, 
                             lifestyle_analysis$Health_Score, 
                             use = "complete.obs")
  cat("\nLifestyle Score vs Health Score Correlation:", 
      round(cor_lifestyle_health, 3), "\n")
}

# ============================================================================
# 8. PREVENTIVE CARE EFFECTIVENESS
# ============================================================================

cat("\n=== PREVENTIVE CARE ANALYSIS ===\n\n")

preventive_analysis <- data %>%
  group_by(`Student ID`, `Full Name`) %>%
  summarise(
    Vaccination_Status = first(`Vaccination Status`),
    Screening_Participation = first(`Health Screening Participation`),
    Preventive_Compliance = first(`Preventive Care Compliance (%)`),
    Preventive_Score = mean(preventive_health_score, na.rm = TRUE),
    Total_Visits = first(`Total Visits (lifetime)`),
    .groups = "drop"
  )

print(preventive_analysis)

# ============================================================================
# 9. SUMMARY REPORT
# ============================================================================

cat("\n=== SUMMARY INSIGHTS ===\n\n")

cat("1. VISIT PATTERNS:\n")
cat("   - Average visits per student:", 
    round(mean(visit_analysis$Total_Visits, na.rm = TRUE), 2), "\n")
cat("   - Students with high visit frequency may need closer monitoring\n\n")

cat("2. DISEASE PATTERNS:\n")
if (nrow(disease_analysis) > 0) {
  cat("   - Most common diagnosis:", disease_analysis$Diagnosis[1], "\n")
  cat("   - Total unique diagnoses:", nrow(disease_analysis), "\n")
}
cat("\n")

cat("3. COMPLIANCE:\n")
cat("   - Overall prescription compliance:", 
    round(compliance_analysis$Dispensed_Rate, 1), "%\n")
cat("   - Lab test completion rate:", 
    round(compliance_analysis$Lab_Test_Completion, 1), "%\n")
cat("   - Follow-up completion rate:", 
    round(compliance_analysis$Follow_up_Completion, 1), "%\n\n")

cat("4. RISK STRATIFICATION:\n")
for (i in 1:nrow(risk_distribution)) {
  cat("   -", risk_distribution$Risk_Level[i], ":", 
      risk_distribution$n[i], "students (", 
      round(risk_distribution$Percentage[i], 1), "%)\n")
}
cat("\n")

cat("5. MENTAL HEALTH:\n")
cat("   - Average mental health score:", 
    round(mean(data$mental_health_score, na.rm = TRUE), 2), "\n")
cat("   - Students with mental health scores < 5 may need intervention\n\n")

cat("6. ACADEMIC CORRELATION:\n")
if (exists("cor_gpa_health")) {
  cat("   - GPA and health show", 
      ifelse(abs(cor_gpa_health) > 0.3, "significant", "weak"), 
      "correlation\n")
}
cat("\n")

cat("=== ANALYSIS COMPLETE ===\n")
cat("Additional visualizations saved to plots/ directory\n\n")

