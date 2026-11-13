export type GuideTopic = 'tasks' | 'journal' | 'focus' | 'reflect' | 'settings'
export type GuideContext = { topic: GuideTopic | 'folders' | 'navigation' | 'backup'; step: string }
export type GuideAnswer = { text: string; steps?: string[]; topic?: GuideTopic; followUps: string[]; context: GuideContext }

export const starterQuestions = [
  'How do I save a note in a folder?',
  'How do I start a focus session?',
  'How do I customize the bottom bar?',
  'How do I plan my tasks?',
]

const answer = (text: string, topic: GuideTopic | undefined, context: GuideContext, steps: string[], followUps: string[]): GuideAnswer =>
  ({ text, topic, context, steps, followUps })

const folderOverview = () => answer('You can keep a Journal note in a folder.', 'journal', { topic: 'folders', step: 'choose' },
  ['Open Journal and choose a folder above the entry list.', 'Write your note in Brain dump and tap Save.'],
  ['What if I do not have a folder yet?', 'How do I link a note to a task?'])
const folderCreate = () => answer('You can create a folder before writing the note.', 'journal', { topic: 'folders', step: 'create' },
  ['Open Journal and tap Folders.', 'Tap New folder, enter a name, and save it.', 'Choose the new folder, then write and save your note.'],
  ['How do I save the note there?', 'How do I back up my notes?'])
const focusStart = () => answer('Focus gives you an open-ended session for one task.', 'focus', { topic: 'focus', step: 'start' },
  ['Tap Start Focus on Home for an open session, or open Tasks and tap play beside a task.', 'Work until you want a break or are ready to finish.'],
  ['How do I pause it?', 'Where can I see focus history?'])
const focusPause = () => answer('You can pause a focus session and return to it later.', 'focus', { topic: 'focus', step: 'pause' },
  ['While a session is running, tap Pause.', 'Choose to stay on the focus screen or leave it.', 'Tap Resume Focus when you are ready to continue.'],
  ['How do I finish the session?', 'Where can I see focus history?'])

const russianPrompts: Record<string, string> = {
  'What if I do not have a folder yet?': 'А если папки ещё нет?',
  'How do I link a note to a task?': 'Как связать заметку с задачей?',
  'How do I save the note there?': 'Как сохранить заметку туда?',
  'How do I back up my notes?': 'Как сохранить резервную копию?',
  'How do I change the theme?': 'Как изменить тему?',
  'Where is Journal?': 'Где находится Journal?',
  'How do I pause it?': 'Как сделать паузу?',
  'Where can I see focus history?': 'Где история фокуса?',
  'How do I plan my tasks?': 'Как планировать задачи?',
  'How do I finish the session?': 'Как завершить сессию?',
  'How do I start a focus session?': 'Как начать фокус-сессию?',
  'How do I save a note in a folder?': 'Как сохранить заметку в папку?',
  'How do I customize the bottom bar?': 'Как настроить нижнюю панель?',
  'How do I create a folder?': 'Как создать папку?',
  'How do I save a note there?': 'Как сохранить заметку туда?',
  'How do I pause a focus session?': 'Как сделать паузу в фокусе?',
}

const russianAnswers: Record<string, { text: string; steps: string[] }> = {
  'folders:choose': { text: 'Заметку Journal можно сохранить в папку.', steps: ['Открой Journal и выбери папку над списком записей.', 'Напиши заметку в поле Brain dump и нажми Save.'] },
  'folders:create': { text: 'Сначала создай папку, затем сохрани в неё заметку.', steps: ['Открой Journal и нажми Folders.', 'Нажми New folder, введи название и сохрани.', 'Выбери новую папку, напиши заметку и нажми Save.'] },
  'focus:start': { text: 'Фокус-сессия помогает работать над одной задачей без фиксированного таймера.', steps: ['Нажми Start Focus на Home или значок запуска рядом с задачей в Tasks.', 'Работай до перерыва или завершения сессии.'] },
  'focus:pause': { text: 'Фокус-сессию можно поставить на паузу и продолжить позже.', steps: ['Во время сессии нажми Pause.', 'Останься на экране фокуса или выйди из него.', 'Когда будешь готов, нажми Resume Focus.'] },
  'focus:finish': { text: 'После завершения время фокуса сохранится.', steps: ['Нажми Finish на экране фокуса.', 'Заполни короткую оценку, если она включена.', 'Сессию можно найти в Focus history или истории задачи.'] },
  'focus:clarify-pause': { text: 'Ты имеешь в виду паузу во время фокус-сессии?', steps: [] },
  'journal:write': { text: 'В Journal можно сохранять заметки и фотографии и раскладывать их по папкам.', steps: ['Открой Journal через плитку на Home.', 'Напиши заметку в Brain dump и нажми Save.', 'Если нужна папка, выбери её до сохранения.'] },
  'navigation:toggle': { text: 'Состав нижней панели можно настроить.', steps: ['Открой Settings, затем Navigation.', 'Включи или выключи Ask LifeOS и Journal для нижней панели.', 'Выбор сохранится автоматически.'] },
  'backup:export': { text: 'Резервная копия сохраняет данные LifeOS в файл.', steps: ['Открой Settings и нажми Export.', 'Сохрани скачанный файл в надёжном месте.', 'При необходимости восстанови его через Import в Settings.'] },
  'tasks:link': { text: 'Заметку Journal можно связать с одной задачей.', steps: ['Открой Tasks и нажми название задачи.', 'В истории нажми Link a note и выбери свободную заметку.', 'Или нажми Write a reflection, чтобы создать новую связанную заметку.'] },
  'tasks:history': { text: 'Можно посмотреть все фокус-сессии или только сессии одной задачи.', steps: ['Нажми Focus history на Home, чтобы увидеть общий список.', 'Для одной задачи открой Tasks и нажми её название.'] },
  'tasks:plan': { text: 'Для текущих дел есть Today, а для идей на потом — Someday.', steps: ['Нажми Add a task на Home или открой Tasks.', 'Выбери Today или Someday.', 'В Today помещается до пяти активных задач.'] },
  'reflect:review': { text: 'Reflect помогает заметить, что делало фокус-сессии полезными.', steps: ['Заверши сессию и заполни короткую оценку.', 'Открой Reflect, чтобы посмотреть закономерности.', 'В истории задачи можно также написать заметку через Write a reflection.'] },
  'settings:personalize': { text: 'В Settings можно настроить LifeOS под себя.', steps: ['Открой Settings.', 'В Personalize выбери тему, а в Navigation настрой нижнюю панель.', 'Там же можно экспортировать резервную копию.'] },
}

export function answerLifeOS(question: string, previous?: GuideContext): GuideAnswer {
  const result = answerEnglish(question, previous)
  if (!/[А-Яа-яЁё]/.test(question)) return result
  const translated = result.topic || result.context.step === 'clarify-pause'
    ? russianAnswers[`${result.context.topic}:${result.context.step}`]
    : undefined
  return {
    ...result,
    text: translated?.text ?? (previous ? 'Уточни, пожалуйста: речь о предыдущем шаге или о другой функции LifeOS?' : 'Я могу помочь с Tasks, Journal, Focus, Reflect и Settings. Выбери близкий вопрос ниже.'),
    steps: translated?.steps ?? [],
    followUps: result.followUps.map(prompt => russianPrompts[prompt] ?? prompt),
  }
}

function answerEnglish(question: string, previous?: GuideContext): GuideAnswer {
  const query = question.toLocaleLowerCase().trim()

  if (/folder|папк/.test(query)) {
    if (/no folder|do not have|don't have|create|new|empty|ещ[её] нет|нет папк|созда|нов/.test(query)) return folderCreate()
    return folderOverview()
  }
  if (/bottom|navigation|nav bar|tab|shortcut|панел|навигац|вкладк|ярлык/.test(query)) {
    return answer('You can choose which shortcuts appear in the bottom bar.', 'settings', { topic: 'navigation', step: 'toggle' },
      ['Open Settings, then Navigation.', 'Turn Ask LifeOS or Journal on or off in the navigation bar.', 'Your choice is saved automatically.'],
      ['How do I change the theme?', 'Where is Journal?'])
  }
  if (/backup|export|save.*copy|резерв|копи|экспорт/.test(query)) {
    return answer('A backup gives you a copy of your LifeOS data.', 'settings', { topic: 'backup', step: 'export' },
      ['Open Settings and use Export to download a backup file.', 'Keep the file somewhere safe.', 'Use Import in Settings if you need to restore it.'],
      ['How do I save a note in a folder?', 'How do I customize the bottom bar?'])
  }
  if (/link|connect|attach|привяз|связ/.test(query) && /journal|note|entry|task|дневник|заметк|запис|задач/.test(query)) {
    return answer('A Journal note can be linked to one task.', 'tasks', { topic: 'tasks', step: 'link' },
      ['Open Tasks and tap the task name.', 'In Task history, tap Link a note to choose an unlinked note.', 'Or tap Write a reflection to create a new linked note.'],
      ['How do I save a note in a folder?', 'How do I start a focus session?'])
  }
  if (/pause|break|пауз|перерыв/.test(query)) {
    if (previous?.topic === 'focus' || /focus|session|фокус|сесси/.test(query)) return focusPause()
    return answer('Do you mean pausing a focus session?', undefined, { topic: 'focus', step: 'clarify-pause' }, [],
      ['How do I pause a focus session?', 'How do I start a focus session?'])
  }
  if (/resume|continue|продолж|возобнов/.test(query) && previous?.topic === 'focus') return focusPause()
  if (/finish|stop|end|закон|заверш/.test(query) && previous?.topic === 'focus') {
    return answer('Finishing saves your focus time.', 'focus', { topic: 'focus', step: 'finish' },
      ['Tap Finish on the focus screen.', 'Complete the check-in if it is enabled.', 'Review the session in Focus history or the task’s history.'],
      ['Where can I see focus history?', 'How do I start a focus session?'])
  }
  if (/focus|session|timer|фокус|сесси|таймер/.test(query)) return focusStart()
  if (/history|истори/.test(query)) {
    return answer('You can review all focus sessions or just those for one task.', 'tasks', { topic: 'tasks', step: 'history' },
      ['Tap Focus history on Home for the full list.', 'For one task, open Tasks and tap its name to see Focus sessions.'],
      ['How do I start a focus session?', 'How do I link a note to a task?'])
  }
  if (previous?.topic === 'folders' && /туда|сохран|save.*there|save.*note/.test(query)) return folderOverview()
  if (previous?.topic === 'focus' && /then|next|потом|дальше/.test(query)) return previous.step === 'pause' ?
    answerEnglish('How do I finish a focus session?', previous) : focusPause()
  if (/journal|note|write|entry|дневник|запис|заметк/.test(query)) {
    return answer('Journal is a place to capture notes and photos. You can organize notes in folders.', 'journal', { topic: 'journal', step: 'write' },
      ['Open Journal from the Home tile.', 'Write in Brain dump, then tap Save.', 'Choose a folder first if you want the note saved there.'],
      ['What if I do not have a folder yet?', 'How do I link a note to a task?'])
  }
  if (/reflect|reflection|check.?in|flow|рефлекс|итог|осмысл|оценк/.test(query)) {
    return answer('Reflect helps you notice what made a focus session useful.', 'reflect', { topic: 'reflect', step: 'review' },
      ['Finish a focus session and complete its check-in.', 'Open Reflect to review patterns from your sessions.', 'You can also write a Journal reflection from a task’s history.'],
      ['How do I start a focus session?', 'How do I link a note to a task?'])
  }
  if (/task|today|someday|plan|задач|сегодня|потом|план/.test(query)) {
    return answer('Keep a small Today list and put later ideas in Someday.', 'tasks', { topic: 'tasks', step: 'plan' },
      ['Tap Add a task on Home or open Tasks.', 'Choose Today for now, or Someday for later.', 'Today holds up to five active tasks.'],
      ['How do I start a focus session?', 'How do I link a note to a task?'])
  }
  if (/settings?|theme|dark|light|account|настрой|тем[аыуе]|аккаунт/.test(query)) {
    return answer('Settings lets you personalize LifeOS.', 'settings', { topic: 'settings', step: 'personalize' },
      ['Open Settings.', 'Choose Personalize for the theme, or Navigation for the bottom bar.', 'You can also export a backup there.'],
      ['How do I customize the bottom bar?', 'How do I back up my notes?'])
  }
  if (previous?.topic === 'folders' && /нет|none|not yet|what if|а если/.test(query)) return folderCreate()
  if (previous?.topic === 'folders' && /then|next|потом|дальше|туда/.test(query)) return folderOverview()

  const contextual = previous?.topic === 'folders' ? ['How do I create a folder?', 'How do I save a note there?']
    : previous?.topic === 'focus' ? ['How do I pause a focus session?', 'How do I finish the session?']
      : starterQuestions.slice(0, 3)
  return answer(previous
    ? 'I want to make sure I understood. Is your question about that last step, or would you like another LifeOS topic?'
    : 'I’m not sure about that one yet. I can help with Tasks, Journal, Focus, Reflect, and Settings. Try one of these:',
  undefined, previous ?? { topic: 'settings', step: 'clarify' }, [], contextual)
}
