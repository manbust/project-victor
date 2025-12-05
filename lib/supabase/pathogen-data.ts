/**
 * Pathogen Dataset for VICTOR System
 * 
 * Contains 30 deadly pathogens with realistic epidemiological data
 * for triage operations and epidemiological monitoring.
 * 
 * Requirements: 3.1, 3.3, 3.4, 3.5
 */

import type { PathogenInsert } from './types';

/**
 * Comprehensive dataset of 30 deadly pathogens
 * 
 * Diversity requirements:
 * - Both air and fluid transmission vectors
 * - Incubation periods ranging from 1 to 21 days
 * - R0 scores from highly contagious (> 10) to moderately contagious (< 5)
 * - Realistic humidity survival thresholds
 */
export const PATHOGEN_DATASET: PathogenInsert[] = [
  // AIRBORNE TRANSMISSION - Highly Contagious (R0 > 10)
  {
    name: 'Measles Virus',
    incubation_period: 10,
    transmission_vector: 'air',
    min_humidity_survival: 30,
    r0_score: 15,
  },
  {
    name: 'Chickenpox (Varicella)',
    incubation_period: 14,
    transmission_vector: 'air',
    min_humidity_survival: 35,
    r0_score: 12,
  },
  {
    name: 'Pertussis (Whooping Cough)',
    incubation_period: 7,
    transmission_vector: 'air',
    min_humidity_survival: 40,
    r0_score: 16,
  },

  // AIRBORNE TRANSMISSION - Moderately Contagious (R0 < 5)
  {

    name: 'Tuberculosis (TB)',
    incubation_period: 21,
    transmission_vector: 'air',
    min_humidity_survival: 45,
    r0_score: 3,
  },
  {
    name: 'Influenza A (H1N1)',
    incubation_period: 2,
    transmission_vector: 'air',
    min_humidity_survival: 20,
    r0_score: 1.5,
  },
  {
    name: 'SARS-CoV-2 (COVID-19)',
    incubation_period: 5,
    transmission_vector: 'air',
    min_humidity_survival: 40,
    r0_score: 2.5,
  },
  {
    name: 'Influenza B',
    incubation_period: 2,
    transmission_vector: 'air',
    min_humidity_survival: 25,
    r0_score: 1.3,
  },
  {
    name: 'Mumps Virus',
    incubation_period: 16,
    transmission_vector: 'air',
    min_humidity_survival: 35,
    r0_score: 4.5,
  },
  {
    name: 'Rubella Virus',
    incubation_period: 14,
    transmission_vector: 'air',
    min_humidity_survival: 30,
    r0_score: 4,
  },
  {
    name: 'SARS-CoV-1',
    incubation_period: 4,
    transmission_vector: 'air',
    min_humidity_survival: 50,
    r0_score: 3,
  },
  {
    name: 'Adenovirus',
    incubation_period: 5,
    transmission_vector: 'air',
    min_humidity_survival: 30,
    r0_score: 2,
  },
  {
    name: 'Respiratory Syncytial Virus (RSV)',
    incubation_period: 4,
    transmission_vector: 'air',
    min_humidity_survival: 35,
    r0_score: 2.5,
  },
  {
    name: 'Diphtheria',
    incubation_period: 3,
    transmission_vector: 'air',
    min_humidity_survival: 40,
    r0_score: 4
,
  },
  {
    name: 'Legionnaires Disease',
    incubation_period: 6,
    transmission_vector: 'air',
    min_humidity_survival: 60,
    r0_score: 1,
  },

  // FLUID TRANSMISSION - Moderately to Highly Contagious
  {
    name: 'Ebola Virus',
    incubation_period: 10,
    transmission_vector: 'fluid',
    min_humidity_survival: 50,
    r0_score: 2,
  },
  {
    name: 'Marburg Virus',
    incubation_period: 9,
    transmission_vector: 'fluid',
    min_humidity_survival: 45,
    r0_score: 2,
  },
  {
    name: 'HIV/AIDS',
    incubation_period: 14,
    transmission_vector: 'fluid',
    min_humidity_survival: 0,
    r0_score: 4,
  },
  {
    name: 'Hepatitis B',
    incubation_period: 90,
    transmission_vector: 'fluid',
    min_humidity_survival: 0,
    r0_score: 3,
  },
  {
    name: 'Hepatitis C',
    incubation_period: 45,
    transmission_vector: 'fluid',
    min_humidity_survival: 0,
    r0_score: 2,
  },
  {
    name: 'Cholera',
    incubation_period: 3,
    transmission_vector: 'fluid',
    min_humidity_survival: 70,
    r0_score: 4,
  },
  {
    name: 'Typhoid Fever',
    incubation_period: 12,
    transmission_vector: 'fluid',
    min_humidity_survival: 60,
    r0_score: 3
,
  },
  {
    name: 'Norovirus',
    incubation_period: 1,
    transmission_vector: 'fluid',
    min_humidity_survival: 40,
    r0_score: 7,
  },
  {
    name: 'Rotavirus',
    incubation_period: 2,
    transmission_vector: 'fluid',
    min_humidity_survival: 35,
    r0_score: 6,
  },
  {
    name: 'Dengue Fever',
    incubation_period: 6,
    transmission_vector: 'fluid',
    min_humidity_survival: 65,
    r0_score: 2.5,
  },
  {
    name: 'Yellow Fever',
    incubation_period: 4,
    transmission_vector: 'fluid',
    min_humidity_survival: 70,
    r0_score: 3,
  },
  {
    name: 'Zika Virus',
    incubation_period: 6,
    transmission_vector: 'fluid',
    min_humidity_survival: 75,
    r0_score: 2,
  },
  {
    name: 'Lassa Fever',
    incubation_period: 10,
    transmission_vector: 'fluid',
    min_humidity_survival: 55,
    r0_score: 1.5,
  },
  {
    name: 'Rabies Virus',
    incubation_period: 30,
    transmission_vector: 'fluid',
    min_humidity_survival: 0,
    r0_score: 1,
  },
  {
    name: 'Polio Virus',
    incubation_period: 10,
    transmission_vector: 'fluid',
    min_humidity_survival: 50,
    r0_score: 5,
  },
  {
    name: 'Hantavirus',
    incubation_period: 18,
    transmission_vector: 'fluid',
    min_humidity_survival: 40,
    r0_score: 1.2,
  },
];
