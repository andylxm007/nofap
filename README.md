# Ember Discipline

A privacy-first Dopamine Detox / NoFap / Self-Improvement static site for overseas users.

## Run

Open `index.html` directly in a browser, or upload the whole folder to any static host.

## Pages

- `index.html`: Home, ember timer, breathing check-in, oracle draw, ink release, and sanctuary audio.
- `articles.html`: SEO-friendly article hub.
- `journal.html`: Private LocalStorage journal for daily reflections.
- `tools.html`: Reserved for future utilities.
- `about.html`: Site introduction.
- `contact.html`: Contact placeholder.

## Local Data

All streak, check-in, oracle, and journal data is stored in the visitor's browser through LocalStorage. There is no login system and no traditional database.

## Oracle Card Images

Put future oracle card images in `cards/` and list them in `cards/manifest.json`. The draw logic avoids repeats until every listed card has appeared once.

## Audio

The Home audio panel includes rain, temple bell, paper writing, and Buddhist Chant channels. Empty audio `src` values fall back to generated browser audio; you can replace them with your own royalty-free files later.
