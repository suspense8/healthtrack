# Student Welfare Health Score Analysis
## Njala University Njala Campus Hospital

This project provides comprehensive health score analysis for student welfare data using R statistical analysis tools.

---

## Project Overview

This analysis system calculates multiple health scores to provide insights into student health and welfare at Njala University Njala Campus Hospital. The system integrates clinical data, mental health indicators, academic performance, lifestyle factors, and preventive care metrics to generate comprehensive health assessments.

---

## Files Description

### Data Files
- **`student_welfare_export_2025-12-05 (2).csv`** - Original dataset
- **`student_welfare_enhanced.csv`** - Enhanced dataset with additional fields for comprehensive analysis
- **`student_welfare_with_scores.csv`** - Output file with calculated health scores (generated after running analysis)

### Analysis Scripts
- **`student_health_analysis.R`** - Main analysis script that calculates all health scores
- **`health_insights.R`** - Additional insights and pattern analysis script

### Output Files
- **`health_scores_summary.csv`** - Summary of health scores by student
- **`plots/`** - Directory containing all generated visualizations

---

## Health Score Components

The analysis calculates seven different health scores:

### 1. **Acute Health Score (0-10)**
   - Based on current visit severity
   - Factors: Triage level, vital signs (BP, temperature, heart rate), emergency status
   - Higher score = better acute health status

### 2. **Chronic Health Score (0-10)**
   - Based on existing conditions and management
   - Factors: Chronic conditions, allergies, treatment compliance, follow-up completion
   - Higher score = better chronic condition management

### 3. **Preventive Health Score (0-10)**
   - Based on preventive care measures
   - Factors: Vaccination status, health screening participation, preventive care compliance
   - Higher score = better preventive care

### 4. **Mental Health Score (0-10)**
   - Based on mental health indicators
   - Factors: PHQ-9 score, GAD-7 score, stress level, sleep quality, counseling attendance
   - Higher score = better mental health

### 5. **Lifestyle Score (0-10)**
   - Based on lifestyle factors
   - Factors: BMI, physical activity, meal frequency, dietary habits
   - Higher score = healthier lifestyle

### 6. **Compliance Score (0-10)**
   - Based on treatment adherence
   - Factors: Prescription status, lab test completion, follow-up visits
   - Higher score = better treatment compliance

### 7. **Composite Health Score (0-10)**
   - Weighted average of all component scores
   - Weights: Acute (20%), Chronic (15%), Preventive (15%), Mental (20%), Lifestyle (15%), Compliance (15%)
   - Overall health indicator

---

## Installation and Setup

### Prerequisites
- R (version 4.0 or higher)
- RStudio (recommended)

### Required R Packages
The scripts will automatically install required packages if not already installed:
- `dplyr` - Data manipulation
- `ggplot2` - Data visualization
- `readr` - Reading CSV files
- `lubridate` - Date handling
- `corrplot` - Correlation plots
- `gridExtra` - Plot arrangement
- `tidyr` - Data tidying

### Manual Installation (Optional)
```r
install.packages(c("dplyr", "ggplot2", "readr", "lubridate", 
                   "corrplot", "gridExtra", "tidyr"))
```

---

## Usage

### Step 1: Run Main Analysis
Open R or RStudio and run:
```r
source("student_health_analysis.R")
```

This will:
- Load and clean the enhanced dataset
- Calculate all health scores
- Generate descriptive statistics
- Create visualizations
- Export results to CSV files

### Step 2: Run Additional Insights
```r
source("health_insights.R")
```

This will:
- Perform pattern analysis
- Calculate correlations
- Generate risk stratification
- Create additional visualizations
- Produce summary insights

---

## Output Files

### CSV Files
1. **`student_welfare_with_scores.csv`**
   - Complete dataset with all calculated health scores
   - Use for further analysis or Power BI integration

2. **`health_scores_summary.csv`**
   - Summary table with health scores by student
   - Quick reference for health status

### Visualizations (in `plots/` directory)
1. **`health_score_comparison.png`** - Health scores compared across students
2. **`health_score_components.png`** - Average scores by component type
3. **`mental_vs_physical_health.png`** - Mental vs physical health relationship
4. **`visit_frequency_analysis.png`** - Visit patterns vs health scores
5. **`health_score_distribution.png`** - Distribution of health scores
6. **`disease_patterns.png`** - Most common diagnoses
7. **`mental_health_correlations.png`** - Mental health correlation matrix
8. **`academic_vs_health.png`** - Academic performance vs health relationship

---

## Data Fields Added

The enhanced dataset includes the following additional fields:

### Mental Health Fields
- Mental Health PHQ-9 Score
- Mental Health GAD-7 Score
- Stress Level (1-10)
- Sleep Quality (1-10)
- Substance Use History
- Counseling Sessions Attended

### Academic Fields
- Academic GPA
- Academic Course Load
- Class Attendance Rate (%)
- Exam Stress Level (1-10)
- Study Hours Per Week

### Lifestyle Fields
- Dietary Habits Assessment
- Physical Activity Level (days/week)
- Meal Frequency (meals/day)
- BMI (calculated if not provided)

### Preventive Care Fields
- Last Vaccination Date
- Vaccination Status
- Health Screening Participation
- Preventive Care Compliance (%)

### Social Determinants
- Family Medical History
- Socioeconomic Status
- Housing Conditions
- Support System Available

### Outcome Tracking Fields
- Recovery Time (days)
- Treatment Effectiveness Score (1-10)
- Follow-up Visit Completed
- Follow-up Outcome
- Readmission Rate (%)
- Quality of Life Score (1-10)

### Temporal Tracking Fields
- Total Visits (lifetime)
- Average Days Between Visits
- Health Trend (Improving/Stable/Declining)
- Seasonal Health Pattern

---

## Interpreting Results

### Health Score Ranges
- **8-10**: Excellent health status
- **6-7.9**: Good health status
- **4-5.9**: Moderate health status - may need intervention
- **0-3.9**: Poor health status - requires immediate attention

### Risk Stratification
- **Low Risk**: Composite score ≥ 8, good mental health, no chronic conditions
- **Moderate Risk**: Composite score 6-7.9, moderate mental health
- **High Risk**: Composite score < 6, poor mental health, or chronic conditions present

### Key Insights to Monitor
1. **Visit Frequency**: High frequency may indicate underlying health issues
2. **Mental Health**: Scores < 5 require intervention
3. **Compliance**: Low compliance affects treatment outcomes
4. **Academic Correlation**: Monitor relationship between academic stress and health
5. **Preventive Care**: Low scores indicate need for health education

---

## Integration with Power BI

To use this data in Power BI:

1. Export the `student_welfare_with_scores.csv` file
2. Import into Power BI as a data source
3. Create visualizations using the health score fields
4. Set up dashboards for:
   - Overall health score trends
   - Risk stratification
   - Mental health monitoring
   - Compliance tracking
   - Disease pattern analysis

---

## Statistical Analysis Methods

### Descriptive Statistics
- Mean, median, standard deviation for all health scores
- Summary statistics by student and by score component

### Correlation Analysis
- Mental health correlations with academic factors
- Lifestyle factors vs health outcomes
- Visit frequency vs health status

### Risk Stratification
- Multi-factor risk assessment
- Categorization into risk levels
- Identification of high-risk students

### Pattern Analysis
- Disease pattern identification
- Visit frequency patterns
- Seasonal health trends

---

## Future Enhancements

Potential additions to the analysis:
1. Predictive modeling for health outcomes
2. Time series analysis for health trends
3. Machine learning for risk prediction
4. Integration with hospital management system
5. Real-time dashboard updates
6. Automated alert system for high-risk students

---

## Troubleshooting

### Common Issues

**Issue**: Package installation errors
- **Solution**: Update R to latest version and install packages manually

**Issue**: Missing data warnings
- **Solution**: Normal - analysis handles missing data with `na.rm = TRUE`

**Issue**: Plot directory not created
- **Solution**: Script creates directory automatically, but ensure write permissions

**Issue**: Date parsing errors
- **Solution**: Check date format in CSV matches YYYY-MM-DD

---

## Contact and Support

For questions or issues:
- **Institution**: Njala University Njala Campus
- **Department**: Mathematics and Statistics
- **Contact**: massaquoisallieu1998@gmail.com

---

## License

This project is part of the research initiative at Njala University Njala Campus Hospital for enhancing clinical research and student welfare through statistical analysis.

---

## Version History

- **v1.0** (2025-12-05): Initial release with comprehensive health score analysis

---

## References

- PHQ-9: Patient Health Questionnaire for depression screening
- GAD-7: Generalized Anxiety Disorder 7-item scale
- BMI: Body Mass Index (normal range: 18.5-24.9)

