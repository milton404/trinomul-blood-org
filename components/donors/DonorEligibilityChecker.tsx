'use client';

import { useState } from 'react';
import { CheckCircle, XCircle, AlertTriangle, Heart, Calendar, Scale, Activity } from 'lucide-react';

interface EligibilityQuestion {
  id: string;
  question: string;
  type: 'yes_no' | 'age' | 'weight' | 'date';
  options?: { value: string; label: string }[];
}

interface EligibilityResult {
  eligible: boolean;
  reasons: string[];
  warnings: string[];
  score: number;
}

const eligibilityQuestions: EligibilityQuestion[] = [
  {
    id: 'age',
    question: 'What is your age?',
    type: 'age',
  },
  {
    id: 'weight',
    question: 'What is your weight (kg)?',
    type: 'weight',
  },
  {
    id: 'recent_illness',
    question: 'Have you had any illness (cold, flu, fever) in the last 7 days?',
    type: 'yes_no',
  },
  {
    id: 'recent_surgery',
    question: 'Have you had any surgery in the last 6 months?',
    type: 'yes_no',
  },
  {
    id: 'recent_donation',
    question: 'Have you donated blood in the last 56 days (8 weeks)?',
    type: 'yes_no',
  },
  {
    id: 'medications',
    question: 'Are you currently taking any medications (antibiotics, blood thinners, etc.)?',
    type: 'yes_no',
  },
  {
    id: 'tattoo_piercing',
    question: 'Have you gotten a tattoo or piercing in the last 6 months?',
    type: 'yes_no',
  },
  {
    id: 'pregnancy',
    question: 'Are you currently pregnant or breastfeeding?',
    type: 'yes_no',
  },
];

interface DonorEligibilityCheckerProps {
  /**
   * Called with the final eligibility result plus the raw answers
   * (age, weight, etc.) so the parent can pre-fill downstream forms.
   */
  onComplete?: (data: { eligible: boolean; answers: Record<string, any> }) => void;
}

export default function DonorEligibilityChecker({ onComplete }: DonorEligibilityCheckerProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [answers, setAnswers] = useState<Record<string, any>>({});
  const [result, setResult] = useState<EligibilityResult | null>(null);
  const [showResult, setShowResult] = useState(false);

  const handleAnswer = (questionId: string, answer: any) => {
    setAnswers((prev) => ({ ...prev, [questionId]: answer }));

    if (currentStep < eligibilityQuestions.length - 1) {
      setCurrentStep((prev) => prev + 1);
    } else {
      calculateEligibility({ ...answers, [questionId]: answer });
    }
  };

  const calculateEligibility = (allAnswers: Record<string, any>) => {
    const reasons: string[] = [];
    const warnings: string[] = [];
    let score = 100;

    // Age check
    const age = parseInt(allAnswers.age) || 0;
    if (age < 18) {
      reasons.push('You must be at least 18 years old to donate blood');
      score -= 100;
    } else if (age < 17 && age > 0) {
      reasons.push('You must be at least 18 years old to donate blood');
      score -= 100;
    } else if (age > 60) {
      warnings.push('Donors over 60 may need additional screening');
      score -= 10;
    }

    // Weight check
    const weight = parseFloat(allAnswers.weight) || 0;
    if (weight > 0 && weight < 50) {
      reasons.push('You must weigh at least 50kg to donate blood');
      score -= 100;
    }

    // Recent illness
    if (allAnswers.recent_illness === 'yes') {
      reasons.push('You must wait 7 days after recovering from an illness');
      score -= 100;
    }

    // Recent surgery
    if (allAnswers.recent_surgery === 'yes') {
      reasons.push('You must wait 6 months after major surgery');
      score -= 100;
    }

    // Recent donation
    if (allAnswers.recent_donation === 'yes') {
      reasons.push('You must wait at least 56 days (8 weeks) between donations');
      score -= 100;
    }

    // Medications
    if (allAnswers.medications === 'yes') {
      warnings.push('Some medications may affect donation eligibility - consult a doctor');
      score -= 20;
    }

    // Tattoo/Piercing
    if (allAnswers.tattoo_piercing === 'yes') {
      reasons.push('You must wait 6 months after getting a tattoo or piercing');
      score -= 100;
    }

    // Pregnancy
    if (allAnswers.pregnancy === 'yes') {
      reasons.push('Pregnant or breastfeeding individuals cannot donate blood');
      score -= 100;
    }

    setResult({
      eligible: reasons.length === 0,
      reasons,
      warnings,
      score: Math.max(0, score),
    });
    setShowResult(true);
    // Notify parent so it can pre-fill downstream forms (e.g. weight, age).
    onComplete?.({
      eligible: reasons.length === 0,
      answers: allAnswers,
    });
  };

  const resetChecker = () => {
    setCurrentStep(0);
    setAnswers({});
    setResult(null);
    setShowResult(false);
  };

  if (showResult && result) {
    return (
      <div className="bg-white rounded-2xl p-6 md:p-8 shadow-lg border border-slate-100">
        <div className="text-center mb-6">
          <div className={`w-20 h-20 rounded-full mx-auto mb-4 flex items-center justify-center ${
            result.eligible 
              ? 'bg-green-100 text-green-600' 
              : 'bg-red-100 text-red-600'
          }`}>
            {result.eligible ? (
              <CheckCircle className="w-10 h-10" />
            ) : (
              <XCircle className="w-10 h-10" />
            )}
          </div>
          <h3 className="text-2xl font-bold text-slate-900">
            {result.eligible ? '✅ You Are Eligible to Donate!' : '❌ Not Currently Eligible'}
          </h3>
          <p className="text-slate-500 mt-2">
            Your eligibility score: <span className={`font-bold ${result.score >= 80 ? 'text-green-600' : result.score >= 50 ? 'text-yellow-600' : 'text-red-600'}`}>{result.score}%</span>
          </p>
        </div>

        {result.reasons.length > 0 && (
          <div className="mb-6">
            <h4 className="font-semibold text-red-700 mb-3 flex items-center gap-2">
              <XCircle className="w-5 h-5" />
              Reasons You Cannot Donate:
            </h4>
            <ul className="space-y-2">
              {result.reasons.map((reason, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-red-700 bg-red-50 p-3 rounded-lg">
                  <XCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                  {reason}
                </li>
              ))}
            </ul>
          </div>
        )}

        {result.warnings.length > 0 && (
          <div className="mb-6">
            <h4 className="font-semibold text-yellow-700 mb-3 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5" />
              Warnings:
            </h4>
            <ul className="space-y-2">
              {result.warnings.map((warning, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-yellow-700 bg-yellow-50 p-3 rounded-lg">
                  <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                  {warning}
                </li>
              ))}
            </ul>
          </div>
        )}

        {result.eligible && (
          <div className="bg-green-50 border border-green-200 p-4 rounded-xl mb-6">
            <p className="text-green-800 font-medium">
              🎉 Great! Visit our registration page to become a donor and save lives!
            </p>
          </div>
        )}

        <button
          onClick={resetChecker}
          className="w-full bg-red-600 text-white py-3 rounded-xl font-semibold hover:bg-red-700 transition-all"
        >
          Check Again
        </button>
      </div>
    );
  }

  const currentQuestion = eligibilityQuestions[currentStep];
  const progress = ((currentStep + 1) / eligibilityQuestions.length) * 100;

  return (
    <div className="bg-white rounded-2xl p-6 md:p-8 shadow-lg border border-slate-100">
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <h3 className="font-bold text-slate-900 flex items-center gap-2">
            <Heart className="w-5 h-5 text-red-500" />
            Donor Eligibility Check
          </h3>
          <span className="text-sm text-slate-500">{currentStep + 1}/{eligibilityQuestions.length}</span>
        </div>
        <div className="w-full bg-slate-200 rounded-full h-2">
          <div 
            className="bg-gradient-to-r from-red-500 to-red-600 h-2 rounded-full transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      <div className="space-y-6">
        <div className="text-lg font-medium text-slate-900">
          {currentQuestion.question}
        </div>

        {currentQuestion.type === 'age' && (
          <div className="grid grid-cols-4 gap-3">
            {[16, 18, 25, 35, 45, 55].map((age) => (
              <button
                key={age}
                onClick={() => handleAnswer(currentQuestion.id, age)}
                className={`py-3 px-4 rounded-xl border-2 font-medium transition-all ${
                  answers[currentQuestion.id] === age
                    ? 'border-red-500 bg-red-50 text-red-700'
                    : 'border-slate-200 hover:border-red-300'
                }`}
              >
                {age}
              </button>
            ))}
            <input
              type="number"
              placeholder="Other"
              min="1"
              max="120"
              className="col-span-2 py-3 px-4 rounded-xl border-2 border-slate-200 focus:border-red-500 outline-none"
              onBlur={(e) => e.target.value && handleAnswer(currentQuestion.id, e.target.value)}
            />
          </div>
        )}

        {currentQuestion.type === 'weight' && (
          <div className="grid grid-cols-4 gap-3">
            {[45, 50, 55, 65, 75, 85].map((w) => (
              <button
                key={w}
                onClick={() => handleAnswer(currentQuestion.id, w)}
                className={`py-3 px-4 rounded-xl border-2 font-medium transition-all ${
                  answers[currentQuestion.id] === w
                    ? 'border-red-500 bg-red-50 text-red-700'
                    : 'border-slate-200 hover:border-red-300'
                }`}
              >
                {w}kg
              </button>
            ))}
            <input
              type="number"
              placeholder="Other"
              min="30"
              max="200"
              className="col-span-2 py-3 px-4 rounded-xl border-2 border-slate-200 focus:border-red-500 outline-none"
              onBlur={(e) => e.target.value && handleAnswer(currentQuestion.id, e.target.value)}
            />
          </div>
        )}

        {(currentQuestion.type === 'yes_no') && (
          <div className="flex gap-4">
            <button
              onClick={() => handleAnswer(currentQuestion.id, 'yes')}
              className={`flex-1 py-4 rounded-xl border-2 font-semibold text-lg transition-all flex items-center justify-center gap-2 ${
                answers[currentQuestion.id] === 'yes'
                  ? 'border-red-500 bg-red-50 text-red-700'
                  : 'border-slate-200 hover:border-red-300 text-slate-700'
              }`}
            >
              <CheckCircle className="w-5 h-5" />
              Yes
            </button>
            <button
              onClick={() => handleAnswer(currentQuestion.id, 'no')}
              className={`flex-1 py-4 rounded-xl border-2 font-semibold text-lg transition-all flex items-center justify-center gap-2 ${
                answers[currentQuestion.id] === 'no'
                  ? 'border-green-500 bg-green-50 text-green-700'
                  : 'border-slate-200 hover:border-green-300 text-slate-700'
              }`}
            >
              <XCircle className="w-5 h-5" />
              No
            </button>
          </div>
        )}
      </div>

      {currentStep > 0 && (
        <button
          onClick={() => setCurrentStep((prev) => prev - 1)}
          className="mt-4 text-slate-500 hover:text-slate-700 underline"
        >
          ← Go Back
        </button>
      )}
    </div>
  );
}
