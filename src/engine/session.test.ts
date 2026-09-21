import { scoreSimulation, type SimulationAnswer } from '@/engine/session';
import type { QuestionCategory } from '@/schema/question';
import type { TestFormat } from '@/schema/region';

/** Fixed "now" so duration math is deterministic. */
const NOW = 1_000_000_000_000;

function answer(
  id: string,
  category: QuestionCategory,
  selectedIndex: number,
  correctIndex: number,
  index = 0,
): SimulationAnswer {
  return {
    question: {
      id,
      category,
      subcategory: 'stopping',
      difficulty: 'easy',
      text: `Question ${id} — a sufficiently long prompt that passes the schema.`,
      options: ['A', 'B', 'C', 'D'],
      correctIndex,
      explanation: 'This is a long enough explanation to satisfy the content contract.',
      handbookRef: 'Traffic Signs and Lights > Signs',
      isFree: true,
    },
    selectedIndex,
    answeredAtMs: NOW + index * 1000,
  };
}

const format: TestFormat = {
  total: 40,
  split: { signs: 20, rules: 20 },
  passPerSection: 16,
  practiceLengths: [10, 20, 40],
  bankTarget: 450,
};

function allCorrect(seed: number): SimulationAnswer[] {
  const answers: SimulationAnswer[] = [];
  for (let i = 0; i < 20; i++) answers.push(answer(`sign-${i}`, 'signs', 0, 0, i));
  for (let i = 0; i < 20; i++) answers.push(answer(`rule-${i}`, 'rules', 0, 0, 20 + i));
  void seed;
  return answers;
}

describe('scoreSimulation', () => {
  it('passes a 20/20, 20/20 simulation', () => {
    const result = scoreSimulation(format, allCorrect(0), NOW);
    expect(result.passed).toBe(true);
    expect(result.correct).toBe(40);
    expect(result.total).toBe(40);
    expect(result.sections).toEqual([
      { category: 'signs', total: 20, correct: 20, passed: true },
      { category: 'rules', total: 20, correct: 20, passed: true },
    ]);
    expect(result.misses).toHaveLength(0);
  });

  it('fails when one section is below the 16/20 bar even with a high total', () => {
    const answers = allCorrect(0);
    // 15/20 in signs — exactly one below the bar.
    for (let i = 0; i < 5; i++) answers[i] = answer(`sign-${i}`, 'signs', 1, 0, i);
    const result = scoreSimulation(format, answers, NOW);
    expect(result.correct).toBe(35);
    expect(result.passed).toBe(false);
    const signs = result.sections.find((section) => section.category === 'signs')!;
    expect(signs.correct).toBe(15);
    expect(signs.passed).toBe(false);
    expect(result.misses).toHaveLength(5);
  });

  it('passes exactly at 16/20 in both sections', () => {
    const answers = allCorrect(0);
    for (let i = 0; i < 4; i++) answers[i] = answer(`sign-${i}`, 'signs', 1, 0, i);
    for (let i = 0; i < 4; i++) answers[20 + i] = answer(`rule-${i}`, 'rules', 1, 0, 20 + i);
    const result = scoreSimulation(format, answers, NOW);
    expect(result.passed).toBe(true);
    expect(result.correct).toBe(32);
  });

  it('measures duration from the first to last answer', () => {
    const answers = allCorrect(0); // answered over 40 seconds (0..39)
    const result = scoreSimulation(format, answers, NOW);
    expect(result.durationMs).toBe(39 * 1000);
  });

  it('collects only the questions answered wrong as misses', () => {
    const answers = allCorrect(0);
    answers[3] = answer('sign-3', 'signs', 2, 0, 3);
    answers[21] = answer('rule-1', 'rules', 3, 0, 21);
    const result = scoreSimulation(format, answers, NOW);
    expect(result.misses).toEqual(['sign-3', 'rule-1']);
  });
});
