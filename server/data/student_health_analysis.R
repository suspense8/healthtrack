# ============================================================================
# Student Welfare Health Score Analysis
# Njala University Njala Campus Hospital
# Enhancing Clinical Research and Student Welfare through Statistical Analysis
# ============================================================================

# Load required libraries
if (!require("dplyr")) install.packages("dplyr")
if (!require("ggplot2")) install.packages("ggplot2")
if (!require("readr")) install.packages("readr")
if (!require("lubridate")) install.packages("lubridate")
if (!require("corrplot")) install.packages("corrplot")
if (!require("gridExtra")) install.packages("gridExtra")
if (!require("tidyr")) install.packages("tidyr")

library(dplyr)
library(ggplot2)
library(readr)
library(lubridate)
library(corrplot)
library(gridExtra)
library(tidyr)

# ============================================================================
# 1. DATA LOADING AND CLEANING
# ============================================================================

# Load the enhanced dataset
data <- read_csv("student_welfare_enhanced.csv", 
                 col_types = cols(.default = col_character()))

# Convert numeric columns
numeric_cols <- c("Age", "Systolic BP", "Diastolic BP", "Heart Rate", 
                  "Respiratory Rate", "Temperature (°C)", "Oxygen Saturation (%)",
                  "Weight (kg)", "Height (cm)", "Mental Health PHQ-9 Score",
                  "Mental Health GAD-7 Score", "Stress Level (1-10)", 
                  "Sleep Quality (1-10)", "Academic GPA", "Academic Course Load",
                  "Class Attendance Rate (%)", "Exam Stress Level (1-10)",
                  "Study Hours Per Week", "Physical Activity Level (days/week)",
                  "Meal Frequency (meals/day)", "BMI", "Preventive Care Compliance (%)",
                  "Recovery Time (days)", "Treatment Effectiveness Score (1-10)",
                  "Readmission Rate (%)", "Quality of Life Score (1-10)",
                  "Total Visits (lifetime)", "Average Days Between Visits",
                  "Counseling Sessions Attended")

for (col in numeric_cols) {
  if (col %in% names(data)) {
    data[[col]] <- as.numeric(data[[col]])
  }
}

# Convert date columns
date_cols <- c("Date of Birth", "Date Registered", "Visit Date", "Last Vaccination Date")
for (col in date_cols) {
  if (col %in% names(data)) {
    data[[col]] <- as.Date(data[[col]], format = "%Y-%m-%d")
  }
}

# Calculate BMI if missing
data$BMI <- ifelse(is.na(data$BMI) & !is.na(data$`Weight (kg)`) & !is.na(data$`Height (cm)`),
                   data$`Weight (kg)` / ((data$`Height (cm)`/100)^2),
                   data$BMI)

# ============================================================================
# 2. HEALTH SCORE CALCULATIONS
# ============================================================================

calculate_acute_health_score <- function(data) {
  # Acute health score based on current visit severity
  # Factors: Triage Level, Vital Signs, Emergency Status
  
  triage_scores <- c("Green" = 3, "Yellow" = 2, "Red" = 1, "Black" = 0)
  data$triage_score <- triage_scores[data$`Triage Level`]
  data$triage_score[is.na(data$triage_score)] <- 1.5
  
  # Normalize vital signs (0-1 scale, where 1 is best)
  # Blood Pressure (normal: 120/80)
  data$bp_score <- 1 - abs((data$`Systolic BP` - 120) / 120) * 0.5
  data$bp_score[data$bp_score < 0] <- 0
  
  # Temperature (normal: 37°C)
  data$temp_score <- 1 - abs((data$`Temperature (°C)` - 37) / 37) * 0.5
  data$temp_score[data$temp_score < 0] <- 0
  
  # Heart Rate (normal: 60-100)
  data$hr_score <- ifelse(data$`Heart Rate` >= 60 & data$`Heart Rate` <= 100, 1,
                         1 - abs((data$`Heart Rate` - 80) / 80) * 0.5)
  data$hr_score[data$hr_score < 0] <- 0
  
  # Emergency penalty
  emergency_penalty <- ifelse(data$`Is Emergency` == "Yes", 0.3, 0)
  
  # Calculate acute health score (0-10 scale)
  data$acute_health_score <- ((data$triage_score / 3) * 4 + 
                               data$bp_score * 2 + 
                               data$temp_score * 2 + 
                               data$hr_score * 2) - emergency_penalty
  
  data$acute_health_score[data$acute_health_score < 0] <- 0
  data$acute_health_score[data$acute_health_score > 10] <- 10
  
  return(data)
}

calculate_chronic_health_score <- function(data) {
  # Chronic health score based on existing conditions and management
  
  # Base score
  base_score <- 10
  
  # Penalties for existing conditions
  condition_penalty <- ifelse(!is.na(data$`Existing Conditions`) & 
                              data$`Existing Conditions` != "", 2, 0)
  
  # Allergy penalty
  allergy_penalty <- ifelse(!is.na(data$Allergies) & data$Allergies != "", 1, 0)
  
  # Treatment compliance (higher compliance = better score)
  compliance_bonus <- ifelse(data$`Prescription Status` == "Dispensed", 1, 0)
  
  # Follow-up completion
  followup_bonus <- ifelse(data$`Follow-up Visit Completed` == "Yes", 1, 0)
  
  data$chronic_health_score <- base_score - condition_penalty - allergy_penalty + 
                               compliance_bonus + followup_bonus
  
  data$chronic_health_score[data$chronic_health_score < 0] <- 0
  data$chronic_health_score[data$chronic_health_score > 10] <- 10
  
  return(data)
}

calculate_preventive_health_score <- function(data) {
  # Preventive health score based on vaccinations and screenings
  
  base_score <- 5
  
  # Vaccination status
  vacc_score <- ifelse(data$`Vaccination Status` == "Up to date", 3,
                      ifelse(data$`Vaccination Status` == "Partial", 1.5, 0))
  
  # Screening participation
  screening_score <- ifelse(data$`Health Screening Participation` == "Yes", 2, 0)
  
  # Preventive care compliance
  compliance_score <- data$`Preventive Care Compliance (%)` / 100 * 2
  
  data$preventive_health_score <- base_score + vacc_score + screening_score + compliance_score
  
  data$preventive_health_score[data$preventive_health_score < 0] <- 0
  data$preventive_health_score[data$preventive_health_score > 10] <- 10
  
  return(data)
}

calculate_mental_health_score <- function(data) {
  # Mental health score based on PHQ-9, GAD-7, stress, sleep
  
  # PHQ-9 (0-27, lower is better) - normalize to 0-10
  phq9_score <- 10 - (data$`Mental Health PHQ-9 Score` / 27 * 10)
  phq9_score[phq9_score < 0] <- 0
  
  # GAD-7 (0-21, lower is better) - normalize to 0-10
  gad7_score <- 10 - (data$`Mental Health GAD-7 Score` / 21 * 10)
  gad7_score[gad7_score < 0] <- 0
  
  # Stress level (1-10, lower is better) - invert
  stress_score <- 10 - data$`Stress Level (1-10)`
  stress_score[stress_score < 0] <- 0
  
  # Sleep quality (1-10, higher is better)
  sleep_score <- data$`Sleep Quality (1-10)`
  
  # Counseling attendance bonus
  counseling_bonus <- pmin(data$`Counseling Sessions Attended` * 0.5, 2)
  
  # Weighted average
  data$mental_health_score <- (phq9_score * 0.3 + gad7_score * 0.3 + 
                               stress_score * 0.2 + sleep_score * 0.15 + 
                               counseling_bonus)
  
  data$mental_health_score[data$mental_health_score < 0] <- 0
  data$mental_health_score[data$mental_health_score > 10] <- 10
  
  return(data)
}

calculate_lifestyle_score <- function(data) {
  # Lifestyle score based on nutrition, physical activity, BMI
  
  # BMI score (normal BMI: 18.5-24.9)
  bmi_score <- ifelse(data$BMI >= 18.5 & data$BMI <= 24.9, 4,
                     ifelse(data$BMI >= 17 & data$BMI < 18.5 | 
                            data$BMI > 24.9 & data$BMI <= 27, 2, 0))
  
  # Physical activity (days/week, max 5 days = 3 points)
  activity_score <- pmin(data$`Physical Activity Level (days/week)` / 5 * 3, 3)
  
  # Meal frequency (3 meals/day = 2 points)
  meal_score <- pmin(data$`Meal Frequency (meals/day)` / 3 * 2, 2)
  
  # Dietary assessment (qualitative)
  diet_score <- ifelse(data$`Dietary Habits Assessment` == "Excellent - well-planned diet", 1,
                      ifelse(data$`Dietary Habits Assessment` == "Good - regular balanced meals", 0.75,
                      ifelse(data$`Dietary Habits Assessment` == "Moderate - balanced diet", 0.5, 0.25)))
  
  data$lifestyle_score <- bmi_score + activity_score + meal_score + diet_score
  
  data$lifestyle_score[data$lifestyle_score < 0] <- 0
  data$lifestyle_score[data$lifestyle_score > 10] <- 10
  
  return(data)
}

calculate_compliance_score <- function(data) {
  # Compliance score based on treatment adherence and follow-ups
  
  base_score <- 5
  
  # Prescription status
  prescription_score <- ifelse(data$`Prescription Status` == "Dispensed", 2, 0)
  
  # Lab test completion
  lab_score <- ifelse(data$`Lab Test Status` == "Completed", 1.5, 0)
  
  # Follow-up completion
  followup_score <- ifelse(data$`Follow-up Visit Completed` == "Yes", 1.5, 0)
  
  data$compliance_score <- base_score + prescription_score + lab_score + followup_score
  
  data$compliance_score[data$compliance_score < 0] <- 0
  data$compliance_score[data$compliance_score > 10] <- 10
  
  return(data)
}

calculate_composite_health_score <- function(data) {
  # Composite health score (weighted average of all scores)
  
  weights <- c(
    acute = 0.20,
    chronic = 0.15,
    preventive = 0.15,
    mental = 0.20,
    lifestyle = 0.15,
    compliance = 0.15
  )
  
  data$composite_health_score <- (
    data$acute_health_score * weights["acute"] +
    data$chronic_health_score * weights["chronic"] +
    data$preventive_health_score * weights["preventive"] +
    data$mental_health_score * weights["mental"] +
    data$lifestyle_score * weights["lifestyle"] +
    data$compliance_score * weights["compliance"]
  )
  
  return(data)
}

# Apply all health score calculations
data <- calculate_acute_health_score(data)
data <- calculate_chronic_health_score(data)
data <- calculate_preventive_health_score(data)
data <- calculate_mental_health_score(data)
data <- calculate_lifestyle_score(data)
data <- calculate_compliance_score(data)
data <- calculate_composite_health_score(data)

# ============================================================================
# 3. DESCRIPTIVE STATISTICS
# ============================================================================

cat("\n=== HEALTH SCORE SUMMARY STATISTICS ===\n\n")

health_scores <- data %>%
  select(`Student ID`, `Full Name`, acute_health_score, chronic_health_score,
         preventive_health_score, mental_health_score, lifestyle_score,
         compliance_score, composite_health_score)

print(summary(health_scores[,3:8]))

cat("\n=== INDIVIDUAL STUDENT HEALTH SCORES ===\n\n")
print(health_scores)

# ============================================================================
# 4. VISUALIZATIONS
# ============================================================================

# Create output directory for plots
if (!dir.exists("plots")) dir.create("plots")

# 1. Health Score Comparison by Student
p1 <- ggplot(health_scores, aes(x = `Full Name`)) +
  geom_col(aes(y = composite_health_score, fill = "Composite"), 
           position = "dodge", alpha = 0.7) +
  geom_col(aes(y = acute_health_score, fill = "Acute"), 
           position = "dodge", alpha = 0.7) +
  geom_col(aes(y = mental_health_score, fill = "Mental Health"), 
           position = "dodge", alpha = 0.7) +
  labs(title = "Health Score Comparison by Student",
       x = "Student", y = "Health Score (0-10)",
       fill = "Score Type") +
  theme_minimal() +
  theme(axis.text.x = element_text(angle = 45, hjust = 1))

ggsave("plots/health_score_comparison.png", p1, width = 10, height = 6)

# 2. Health Score Components Radar Chart (Alternative: Bar Chart)
score_components <- health_scores %>%
  select(-`Student ID`, -`Full Name`) %>%
  summarise_all(mean, na.rm = TRUE) %>%
  gather(key = "Component", value = "Average_Score")

p2 <- ggplot(score_components, aes(x = Component, y = Average_Score, fill = Component)) +
  geom_col() +
  labs(title = "Average Health Score by Component",
       x = "Health Score Component", y = "Average Score (0-10)") +
  theme_minimal() +
  theme(axis.text.x = element_text(angle = 45, hjust = 1)) +
  scale_fill_brewer(palette = "Set2")

ggsave("plots/health_score_components.png", p2, width = 10, height = 6)

# 3. Mental Health vs Physical Health
p3 <- ggplot(data, aes(x = mental_health_score, y = acute_health_score, 
                       color = `Triage Level`, size = `Stress Level (1-10)`)) +
  geom_point(alpha = 0.7) +
  labs(title = "Mental Health vs Acute Health Score",
       x = "Mental Health Score", y = "Acute Health Score",
       color = "Triage Level", size = "Stress Level") +
  theme_minimal()

ggsave("plots/mental_vs_physical_health.png", p3, width = 10, height = 6)

# 4. Visit Frequency Analysis
if (!is.null(data$`Total Visits (lifetime)`)) {
  p4 <- ggplot(data, aes(x = `Total Visits (lifetime)`, y = composite_health_score)) +
    geom_point(aes(color = `Triage Level`), size = 3, alpha = 0.7) +
    geom_smooth(method = "lm", se = TRUE) +
    labs(title = "Visit Frequency vs Composite Health Score",
         x = "Total Visits (Lifetime)", y = "Composite Health Score",
         color = "Triage Level") +
    theme_minimal()
  
  ggsave("plots/visit_frequency_analysis.png", p4, width = 10, height = 6)
}

# 5. Health Score Distribution
health_long <- health_scores %>%
  select(-`Student ID`) %>%
  gather(key = "Score_Type", value = "Score", -`Full Name`)

p5 <- ggplot(health_long, aes(x = Score_Type, y = Score, fill = Score_Type)) +
  geom_boxplot(alpha = 0.7) +
  labs(title = "Health Score Distribution by Type",
       x = "Health Score Type", y = "Score (0-10)") +
  theme_minimal() +
  theme(axis.text.x = element_text(angle = 45, hjust = 1)) +
  scale_fill_brewer(palette = "Pastel1")

ggsave("plots/health_score_distribution.png", p5, width = 10, height = 6)

# ============================================================================
# 5. EXPORT RESULTS
# ============================================================================

# Save enhanced data with health scores
write_csv(data, "student_welfare_with_scores.csv")

# Save health score summary
write_csv(health_scores, "health_scores_summary.csv")

cat("\n=== ANALYSIS COMPLETE ===\n")
cat("Results saved to:\n")
cat("  - student_welfare_with_scores.csv\n")
cat("  - health_scores_summary.csv\n")
cat("  - plots/ directory\n\n")

