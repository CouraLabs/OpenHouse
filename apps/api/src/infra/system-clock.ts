import { Clock } from '@workspace/business'

export class SystemClock extends Clock {
  now(): Date {
    return new Date()
  }
}
