import test from 'node:test'
import assert from 'node:assert/strict'
import { answerLifeOS } from '../src/home/lifeosGuide.ts'

test('local guide answers app topics and unknown questions without reading user data', () => {
  for (const [question, topic] of [
    ['How do I add a task?', 'tasks'],
    ['Where is Journal?', 'journal'],
    ['How does Focus work?', 'focus'],
    ['What is Reflect?', 'reflect'],
    ['Change the dark theme', 'settings'],
  ]) assert.equal(answerLifeOS(question).topic, topic)
  assert.deepEqual(answerLifeOS('weather tomorrow').topic, undefined)
  assert.match(answerLifeOS('weather tomorrow').text, /Tasks, Journal, Focus, Reflect, and Settings/)
})

test('guide follows the current step and switches topics on a new question', () => {
  const journal = answerLifeOS('Куда деть запись?')
  assert.equal(journal.context.topic, 'journal')
  assert.ok(journal.followUps.some(prompt => /папк/i.test(prompt)))
  const folder = answerLifeOS('А если папки ещё нет?', journal.context)
  assert.equal(folder.context.step, 'create')
  assert.ok(folder.steps.some(step => /New folder/.test(step)))

  const focus = answerLifeOS('Как начать фокус?', folder.context)
  assert.equal(focus.context.topic, 'focus')
  const pause = answerLifeOS('А как сделать паузу?', focus.context)
  assert.equal(pause.context.step, 'pause')
  assert.ok(pause.steps.some(step => /Pause/.test(step)))

  const navigation = answerLifeOS('How do I customize the bottom bar?', pause.context)
  assert.equal(navigation.context.topic, 'navigation')
  assert.ok(navigation.followUps.some(prompt => /theme/.test(prompt)))
})
