import test from 'node:test';
import assert from 'node:assert/strict';
import { dayReminderPush, restTimerPush, testPush } from '../push-messages.js';

test('words every server-generated notification in English, whatever the language', () => {
  assert.deepEqual(restTimerPush('en'), { title: 'Rest over 💪', body: 'Time for your next set.', tag: 'rest-timer' });
  assert.deepEqual(restTimerPush('de'), restTimerPush('en'));
  assert.equal(dayReminderPush('unknown', null).title, 'Workout planned today');
  assert.equal(testPush(undefined).body, 'Test notification ✅ This is what alerts look like.');
});
