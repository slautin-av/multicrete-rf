# Кандидат №XX

<!--
ИНСТРУКЦИЯ:
1. Скопируй этот файл, переименуй в `кандидат_1.md`, `кандидат_2.md` и т.д.
2. Замени XX в заголовке на номер.
3. Заполни ВСЕ поля. Особенно «Тип» — без него Claude должен догадываться.
4. HTML и CSS вставляй ВНУТРИ блоков ```html ... ``` и ```css ... ``` — тогда подсветка работает.
5. Когда наберёшь сколько хочешь — скажи мне «готово, посмотри».
-->

**Ссылка:** https://uiverse.io/minecrafte_8792/swift-pig-58
https://uiverse.io/javierBarroso/witty-wolverine-69

**Тип:** (вычеркни ненужное, оставь одно)
- `cta` — прямоугольная кнопка действия (Запросить, Скачать, Связаться)


**Автор на Uiverse и заметки про него:**
#212121
#e8e8e8

**Моё впечатление:**
простая и в то же время оригинальная кнопка, четкий контур и эффект 3D в последствии можно поменять цвет

---

## HTML

<button>Click me</button>


## CSS

button {
  color: #fff;
  padding: 0.7em 1.7em;
  font-size: 18px;
  border-radius: 0.5em;
  background: #212121;
  cursor: pointer;
  border: 1px solid #212121;
  transition: all 0.3s;
  box-shadow:
    6px 6px 12px #0a0a0a,
    -6px -6px 12px #2f2f2f;
}

button:active {
  color: #666;
  box-shadow:
    0px 0px 0px #000,
    0px 0px 0px #2f2f2f,
    inset 4px 4px 12px #1a1a1a,
    inset -4px -4px 12px #1f1f1f;
}

еще светлый вариант
## CSS
button {
  color: #090909;
  padding: 0.7em 1.7em;
  font-size: 18px;
  border-radius: 0.5em;
  background: #e8e8e8;
  cursor: pointer;
  border: 1px solid #e8e8e8;
  transition: all 0.3s;
  box-shadow:
    6px 6px 12px #c5c5c5,
    -6px -6px 12px #ffffff;
}

button:active {
  color: #666;
  box-shadow:
    0px 0px 0px #c5c5c5,
    0px 0px 0px #ffffff,
    inset 4px 4px 12px #c5c5c5,
    inset -4px -4px 12px #ffffff;
}

