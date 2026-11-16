// Choosing a picture, for the measuring scripts. A picture is chosen on Listen, in step 1 (the radio
// group "Choose a NASA picture"); every other view (Play along, Globe, Compare) plays the picture
// chosen there, and the choice is kept when the view changes with the address. So the scripts list
// the pictures from Listen, choose one there, and then open the view they measure.
import { expect, type Page } from '@playwright/test';

/** The one-word name each report gives its pictures, by the key the app gives them. */
const NAME: Record<string, string> = { ocean: 'Ocean', aerosols: 'Aerosols', imerg: 'Rain', practice: 'Practice' };

export interface PictureChoice {
  /** The picture's key in the app (the value of its radio on Listen). */
  key: string;
  /** The name the reports use: Ocean, Aerosols, Rain. */
  label: string;
}

const listenRadio = (page: Page, key: string) => page.locator(`input[name="picture"][value="${key}"]`);

/** Every picture the app offers on Listen (step 1), in the order it lists them. Leaves the page on Listen. */
export async function pictureChoices(page: Page): Promise<PictureChoice[]> {
  await page.goto('/#listen');
  await expect(page.getByRole('group', { name: 'Step 1 of 3: Choose a NASA picture' })).toBeVisible();
  const keys = await page.locator('input[name="picture"]').evaluateAll((radios) => radios.map((r) => (r as HTMLInputElement).value));
  expect(keys.length, 'Listen offers no picture').toBeGreaterThan(0);
  return keys.map((key) => ({ key, label: NAME[key] ?? key }));
}

/** Choose a picture on Listen, then open `view`, which plays that picture. */
export async function choosePicture(page: Page, picture: PictureChoice, view: 'play' | 'globe' | 'compare' | 'listen' = 'play') {
  await page.goto('/#listen');
  await listenRadio(page, picture.key).check();
  await expect(listenRadio(page, picture.key)).toBeChecked();
  if (view !== 'listen') await page.goto(`/#${view}`);
}
