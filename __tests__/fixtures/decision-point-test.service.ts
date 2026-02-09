import { Injectable } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class DecisionPointTestService {
  /**
   * Single method that hits every decision point for complexity report testing.
   * Control flow: if, else if, for, for-of, for-in, while, do-while, switch, case, catch.
   * Expressions: ternary, &&, ||, ??, ?.
   * Default parameter.
   */
  runAllDecisionPoints(
    items: string[],
    opts: { flag?: boolean; value?: number } = {},
    defaultValue: number = 10
  ): number {
    let total = 0;
    const val = opts?.value ?? defaultValue;
    const flag = opts?.flag && items.length > 0;

    if (items.length === 0) return 0;
    else if (items.length === 1) total += 1;

    for (let i = 0; i < items.length; i += 1) total += 1;
    for (const item of items) total += item?.length ?? 0;
    for (const k in items) total += items[k]?.length ?? 0;

    let n = 0;
    while (n < 3) {
      total += n;
      n += 1;
    }
    let m = 0;
    do {
      total += m;
      m += 1;
    } while (m < 2);

    switch (items.length) {
      case 0:
        break;
      case 1:
        total += 1;
        break;
      default:
        total += 2;
    }

    try {
      total += flag ? 1 : 0;
    } catch {
      total += 0;
    }

    return total;
  }
}
