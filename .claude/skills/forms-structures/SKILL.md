---
name: forms-structures
description: How to structure and design web forms that are accessible and easy to fill in — which fields to ask for, required vs optional, picking the right control (radio, checkbox, select, text), grouping with fieldset/legend and sections, labels, sizing and laying out inputs by data type (short fields for days, codes, amounts), styled radios/checkboxes and option cards that must still read as choices, forgiving input formats, error messages, and keeping user input after a failed submit. Use whenever you build, review, refactor, or audit any form, sign-up/checkout/settings page, dialog with inputs, survey, or field group, in plain HTML or any framework (React, Vue, Svelte, shadcn, etc.), even if the user only says "add a field" or "make this form better".
---

# Structuring web forms

A form is a conversation in which the user does the work. Good structure moves that work off the user: ask less, group what belongs together, label everything plainly, accept input the way people type it, and never lose what they entered. Correct semantic structure is also what makes a form usable with assistive technology. A sighted user can guess from layout, but a screen reader only knows what the markup says.

These rules are framework-agnostic. In a component library, check that the rendered DOM keeps the same semantics: a real `<label>` (or `aria-labelledby`), a `<fieldset>`/`<legend>` or `role="group"` + `aria-labelledby` around groups, and a real `<form>`. When a project has its own form conventions (a CLAUDE.md, design system, or shared form components), follow those first and use this skill to fill gaps.

## 1. Decide what to ask before writing markup

Every field costs the user time and the business completions. For each field, ask:

1. **Is this valuable to us?** If not, drop it. A salutation/title rarely is.
2. **Is it valuable enough to block the user if they skip it?** Only then make it required. A phone number is often useful but not essential, so keep it optional.

Shorter forms get finished. When a form still runs long, split it into sections (below) or across pages/steps rather than one huge scroll.

## 2. Skeleton

```html
<form>
  <h1>Payment</h1>
  <p>Required fields are marked with *.</p>

  <section>
    <h2>Contact information</h2>
    <p>
      <label for="name">Name *</label>
      <input id="name" name="name" type="text" autocomplete="name" required />
    </p>
    <p>
      <label for="email">Email *</label>
      <input id="email" name="email" type="email" autocomplete="email" required />
    </p>
    <p>
      <label for="phone">Phone</label>
      <input id="phone" name="phone" type="tel" autocomplete="tel" />
    </p>
  </section>

  <section>
    <h2>Payment information</h2>
    …
  </section>

  <p><button type="submit">Pay now</button></p>
</form>
```

Why each piece matters:

- **One `<form>` wraps every control.** Browsers, password managers and assistive tech find forms by this element. Never nest one `<form>` in another; behavior becomes unpredictable. A control that has to live elsewhere in the DOM can join the form with `form="<form-id>"`.
- **Headings and `<section>`s** split a long form into named areas the user can scan and jump between.
- **Wrap each label + control pair** in a `<p>`, `<div>`, or `<li>`. Use a list for a run of radios or checkboxes.
- **The submit button sits last**, after every field, with a verb that says what happens ("Pay now", "Create account"), not "Submit".

## 3. Labels

The label is the single most important element in a form.

- **Every control gets a visible label**, tied to it programmatically: `<label for="id">` + `id`, or the control nested inside the `<label>` (set `for` too; some assistive tech only reads the explicit link). An unlabeled input is announced as something like "edit text, blank".
- **Placeholder text is not a label.** It disappears on typing and is often low contrast. Use it only for a format hint (`MM/YY`), if at all.
- **Labels are click targets.** Clicking a label focuses or toggles its control, which matters most for small checkboxes and radios.
- **One label per control.** Multiple `<label>`s for one input confuse some screen readers. Put the required marker inside the label text (`Name *`) instead of in a second label.
- **Be specific and short.** The user should never wonder what to type. "Name on card" beats "Name"; "Work email" beats "Email" when it matters. Longer guidance goes in hint text linked with `aria-describedby`, not stuffed into the label.

## 4. Required and optional fields

- Mark them **in the label text**: an asterisk or the word "(required)". Explain the symbol **before the first field** ("Required fields are marked with *."), so every user learns the convention before meeting it.
- Also set the `required` attribute (or `aria-required="true"` on custom controls) so assistive tech announces it.
- Bold, italic or color alone is not a marker. Avoid red for required fields; users read red as an error.
- If most fields are required, consider marking the *optional* ones instead. Either way, be consistent within the form.
- Alternatively split the form into "Required" and "Optional" sections.

## 5. Choose the right control

| Situation | Control |
|---|---|
| Exactly one choice from a few (2 to about 5) options | Radio buttons in a `<fieldset>` |
| Any number of independent options, including none | Checkboxes in a `<fieldset>` |
| A single on/off or yes/no consent | One standalone checkbox |
| Exactly one choice from many options | `<select>` (or a searchable combobox for very long lists) |
| Free text | `<input>` with the right `type` (`email`, `tel`, `url`, `number`, `date`, `password`) or `<textarea>` |

- Avoid multi-select list boxes; few users know Ctrl/Cmd-click. Use checkboxes, and if there are too many, consolidate or group them hierarchically.
- The radio/select boundary is a judgment call. Five or more radios is a signal to consider a select; fewer than three visible options in a select is a signal to use radios.
- Prefer hiding options that don't apply over showing them disabled with no explanation.

## 6. Group related controls with fieldset and legend

```html
<fieldset>
  <legend>Delivery speed</legend>
  <ul>
    <li><label><input type="radio" name="speed" value="standard" /> Standard</label></li>
    <li><label><input type="radio" name="speed" value="express" /> Express</label></li>
  </ul>
</fieldset>
```

- **Always put a radio group in a `<fieldset>`** with a `<legend>` as its first child. Screen readers prefix each option with the legend ("Delivery speed, Standard, radio button"), which is how the user knows what the options answer.
- Do the same for checkbox groups and multi-part fields (date as day/month/year, a full address, card details).
- A fieldset can also section a long single-page form, but don't overuse it: the legend is repeated for every control inside, and nested fieldsets get noisy. If it sounds odd in a screen reader, restructure.

## 7. Size and lay out fields by the type of data

A field's width tells the user how long an answer is expected. When every input stretches to the full width of the form, a 2-digit day looks like it wants a paragraph, the eye has to travel across empty boxes, and the form looks longer than it is. Size each field for the longest *typical* value it holds, not for the container.

Use `ch` units (one character width) so the size follows the font. Add about 2 to 4 `ch` for padding, icons and steppers.

| Data | Typical width | Notes |
|---|---|---|
| Day, month, hour, minute, short counts | 3 to 5ch | Two digits plus room for a stepper |
| Year, CVC, PIN, quantity | 5 to 7ch | |
| Expiry `MM/YY`, short codes | 7 to 9ch | |
| Postal / ZIP code | 8 to 12ch | Varies by country |
| Percentage, small numbers | 6 to 10ch | Put the unit (`%`, `kg`) as a suffix next to the field |
| Money amount | 12 to 16ch | Right-align digits; show the currency as a prefix or suffix |
| Date (picker or typed) | 12 to 16ch | |
| Phone number | 15 to 20ch | |
| Card number | 20 to 23ch | 16 to 19 digits plus spaces |
| Given or family name | 20 to 30ch | Never below 20 characters, never cap `maxlength` tightly |
| Full name, city, single-line title | 25 to 40ch | |
| Email, URL, street address | 30 to 50ch | Long values are common; can take the full column |
| Search | full column | |
| Description, notes, message | `<textarea>`, about 50ch by 4 to 10 rows | Avoid very tall-narrow or wide-short shapes |

Layout rules that go with it:

- **Cap the form column** at about 40 to 60ch wide for single-column forms. A full-screen-wide form makes every field too long and labels drift away from their inputs.
- **One field per row by default.** Single-column forms are filled faster and in the right order. Put fields side by side only when they are short and form one value or obviously belong together: day/month/year, city + region + postal code, expiry + CVC, amount + currency.
- **Short fields stay short when they share a row.** In a grid, give the short field a fixed `ch` width and let only the long one grow (`grid-template-columns: 1fr 10ch`), instead of splitting the row 50/50.
- **Keep labels close to their field**: label above the input is the safest pattern; left-aligned labels in a two-column grid only for long, rarely-used admin forms.
- **Choice controls by option length**: short options (Yes/No, S/M/L) can sit inline on one row; long option text goes one per line.
- **Mobile**: below about 480px, long fields can go full width, but short fields (day, CVC, quantity, postal code) keep their narrow width so they still read as short.
- Don't use width to fake hierarchy; size follows the data, and spacing and headings carry structure.

## 8. Styled radios and checkboxes must still look like radios and checkboxes

Custom-styled choice controls go wrong in a familiar way: the option turns into a big card or tile that fills the screen, the actual circle or box disappears, and the user can't tell whether they are looking at a button, a link, a navigation card or a selection, or whether picking one excludes the others. When building or reviewing a form, check every custom radio and checkbox against this list:

- **The indicator is visible.** A radio shows a circle with a dot when selected; a checkbox shows a square with a check mark. Keep the shape even when restyled. A highlighted border or background color alone is not enough to say "selected", and it fails for color-blind users and in high-contrast mode.
- **Radio vs checkbox stays obvious.** Circles mean "pick one", squares mean "pick any". Don't make a single-choice group look like checkboxes or toggle buttons, or a multi-choice group look like radios.
- **The control is sized for the option, not the screen.** The indicator is about the size of the text (roughly 1em to 1.25em), and the clickable row is the indicator plus its label, with a comfortable target of at least 24px and ideally 44px high on touch screens. An option should not stretch to the full width or height of the viewport, and a group of choices should not push the rest of the form below the fold.
- **Card or tile options are an exception, not the default.** Use them only when each option genuinely needs more than a line of content (a plan with a price and features, a payment method with a logo). Even then, show the radio or checkbox indicator inside the card, keep cards compact and evenly sized, and lay them out in a row or tight grid rather than one giant block per option.
- **Keep the native input.** Visually restyle a real `<input type="radio">` / `<input type="checkbox">` (`appearance: none` plus your own drawing, or `accent-color` for a simple brand tint), or hide it visually while keeping it in the accessibility tree. Never use `display: none` on it and rebuild the choice from `<div>`s; that loses keyboard support, form submission and screen-reader state. Custom components must expose `role="radio"`/`"checkbox"` and `aria-checked` if there is no native input at all.
- **Keyboard and focus work.** Tab reaches the group, arrow keys move between radios in a group, Space toggles a checkbox, and a visible focus ring sits on the indicator or the whole option.
- **States are all distinct**: unchecked, checked, focus, hover, disabled, and invalid, each recognisable without relying on color alone.
- **The label is part of the target.** Clicking the text selects the option, but the clickable area ends at the option, so users can't select something by accident while scrolling.
- **The group still has a `<fieldset>` and `<legend>`**, however the options are drawn.
- **Toggle switches are for settings that apply immediately** (on/off, takes effect without a submit). Inside a form that is saved with a button, use a checkbox.

If a design asks for options that look like big buttons, ask whether they are really a choice (keep radio semantics and indicators) or actions that happen immediately (then they are buttons, not form fields).

## 9. Let the computer handle formatting

People type phone numbers as `(800) 555-1212`, `800-555-1212`, `800.555.1212`, `800 555 1212` or `8005551212`. They're all the same number.

- **Accept any reasonable format and normalize in code** (strip spaces, dashes, dots, parentheses; trim whitespace; case-fold emails). Don't reject input over formatting the machine can fix.
- Don't split one value into several auto-advancing boxes (phone in three parts, card in four). Auto-advance breaks when the user goes back to fix a typo, and pasting fails.
- When a format truly matters, show it as a hint before input (`MM/YY`) and validate with `pattern` or code, not by rejecting after the fact.
- Use `autocomplete` tokens (`name`, `email`, `tel`, `street-address`, `postal-code`, `cc-number`, …) and correct `type`/`inputmode` so browsers fill fields and mobile keyboards match.
- Addresses: separate fields for street, unit, city, region, postal code, with a country selector when international. Let the user type the region unless a select clearly helps data quality.

## 10. Write error messages that help

- **Say what happened, what it means, and what to do next.** "We couldn't reach the card processor. Your card was not charged. Please try again in a few minutes or contact support@…" beats "Credit card error".
- **Don't blame the user for system failures.** If nothing they typed can fix it, say so.
- **Point at the field.** Put the message next to the control it concerns, link it with `aria-describedby`, set `aria-invalid="true"`, and mark the field visually by more than color alone (icon, text, border). For several errors, a summary at the top linking to each field helps.
- Move focus to the first invalid field (or the summary) after a failed submit.
- Validate a field when the user leaves it or on submit, not on every keystroke while they are still typing.

## 11. Never hand back an altered form

After a failed submit or a server error, return the form **exactly as the user left it**: every typed value, every checkbox state, every selection.

- Don't clear fields that were fine. Re-entering valid data is the most infuriating form experience.
- The one defensible exception is password fields, cleared for security; say so if you do it.
- Never quietly re-check a marketing opt-in or clear a terms checkbox the user already handled. Respect what they chose.
- In SPA forms, keep state across validation and server errors; don't reset the form on a failed request.

## Review checklist

Use this when building or auditing a form:

- [ ] Every field passes "is it valuable?" and every required field passes "worth blocking for?"
- [ ] One `<form>`, no nesting; title heading; sections with headings for long forms
- [ ] Every control has a visible, specific, programmatically linked label; placeholder is not the label
- [ ] Required convention explained before the first field; marker in the label text plus `required`
- [ ] Radios and checkbox groups sit in `<fieldset>` + `<legend>`
- [ ] Right control for the choice (radio / checkbox / select / text); no multi-select boxes
- [ ] Each input is sized for its data type (day, CVC, postal code, amount stay short), not stretched to the container; names allow at least 20 characters
- [ ] Form column capped at about 40 to 60ch; one field per row unless short related fields share a row
- [ ] Custom radios and checkboxes still show a circle/square indicator, are sized for their option (not filling the screen), keep a native input, and work by keyboard with visible focus
- [ ] Card/tile options are used only when an option needs rich content, and still show the indicator
- [ ] Input formats accepted loosely and normalized in code; `type` and `autocomplete` set
- [ ] Errors are specific, next to their field, announced, and explain what to do
- [ ] A failed submit keeps everything the user entered
- [ ] Submit button is last and names its action
- [ ] Tabbed through with a keyboard, and the screen reader announcements make sense

## Sources

- MDN, "How to structure a web form" — semantic structure, labels, fieldset/legend, required markers.
- Brian Crescimanno, "Sensible Forms: A Form Usability Checklist", A List Apart — field choice, required fields, sizing, formatting, errors, preserving input.
