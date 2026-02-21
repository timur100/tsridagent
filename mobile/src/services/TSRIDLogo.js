/**
 * TSRID Logo Bitmap Data
 * Generated from TSRID_Logo2.png
 * Used for label printing
 */

export const LOGO_WIDTH = 236;
export const LOGO_HEIGHT = 60;
export const LOGO_ROW_BYTES = 30;

// Base64 encoded bitmap data (1-bit, black = 1)
export const LOGO_DATA_BASE64 = "P4AAAAAH8B/////gAH/4AAD///gAAA/8AP/+AAAAf8AAAAAP+D/////wA///AAH////gAA/+Af///AAA/4AAAAAH/D/////wB///wAD////8AA/+Af///4AA8AAAAAAAHD/////wH///4AD////+AA/+Af///+AA4AAAAAAAHD/////wP///8AD/////AA/+Af////AA4AAD/wAAHD/////wf///+AD/////gA/+Af////gA4AAf/+AAHD/////wf////AD/////wA/+Af////wA4AB///gAHD/////w/////AD/////wA/+Af////4A4AD+AfwAHD/////w//z//gD/////4A/+Af////8A4AHw/D4AHB/////h/8Af/wD/wAP/4A/+Af/Af/8AQAPH/4+ADAAD/4AB/8AH/wD/wAH/4A/+Af/AD/+AAAef/+fAAAAD/4AB/4AD/AD/wAD/8A/+Af/AB//AAA8/h/PAAAAD/4AD/4AD4AD/wAD/8A/+Af/AA//AAB58AP3gAAAD/4AD/4ABAAD/wAB/8A/+Af/AA//gADzx/z7wAAAD/4AD/8AAAAD/wAB/8A/+Af/AAf/gADnn/55wAAAD/4AD/+AAAAD/wAB/8A/+Af/AAP/gAHvf/+84AAAD/4AB//wAAAD/wAD/8A/+Af/AAP/wAHe+Afe4AAAD/4AB///gAAD/wAD/8A/+Af/AAP/wAPc8/PucAAAD/4AB///+AAD/wAH/4A/+Af/AAH/wAO97/zncAAAD/4AB////gAD/wAf/4A/+Af/AAH/wAO73/73eAAAD/4AA////4AD/////wA/+Af/AAH/wAc7vh9zuAAAD/4AA////8AD/////wA/+Af/AAH/wAd3vMc7uAAAD/4AAf///+AD/////gA/+Af/AAH/wAd3e/O7uAAAD/4AAP////AD/////AA/+Af/AAH/wAd3d/u7uAAAD/4AAD////gD////+AA/+Af/AAH/wAd3d7mZmAAAD/4AAA////wD////4AA/+Af/AAH/wAd2Zx3dmAAAD/4AAAP///wD////wAA/+Af/AAH/wAdmbh3dmAAAD/4AAAB///4D////4AA/+Af/AAP/wAZmZh3d2AAAD/4AAAAD//4D/wD/4AA/+Af/AAP/wADu4Dnd2AAAD/4AAAAAf/4D/wD/8AA/+Af/AAP/wAHu4Dud3AAAD/4AAAAAH/4D/wB/8AA/+Af/AAf/gAPe4Dud2AAAD/4AAAAAD/4D/wB/+AA/+Af/AAf/gAO94HOdwAAAD/4AAfAAD/4D/wB/+AA/+Af/AA//gAN5wPcdwAAAD/4AH/gAD/4D/wA/+AA/+Af/AA//AAD7wecc4AAAD/4AP/gAD/4D/wA//AA/+Af/AB//AAP3g84c4AAAD/4AH/wAH/wD/wAf/AA/+Af/AH/+AAPPB54O8AAAD/4AH/8AP/wD/wAf/gA/+Af/Af/+AAOeDzwOeAAAD/4AH//h//wD/wAf/gA/+Af////8AAB8PngOOAAAD/4AD/////gD/wAP/gA/+Af////4AAH4fPsHEAAAD/4AB/////AD/wAP/wA/+Af////wAAHx+feHgAAAD/4AB/////AD/wAP/wA/+Af////gAADH4+fDgAAAD/4AA////+AD/wAH/4A/+Af////AAAAfz4/D4AAAD/4AAf///8AD/wAH/4A/+Af///+AAAB/Hx/h4AAAD/4AAH///wAD/wAD/8A/+Af///4AAAB8fjzw4AAAD/4AAB///gAH/wAD/8A/+Af///gAAABx+Hh4AAAAD/wAAAf/8AAD/wAB/8A/8Af//4AAAAAH8PA+AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAfw+IeAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAfB8cOAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAQAMH4+AACAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA4AAfh/AAHAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA4AAfD3gAHB4HgPAcBIDwMBwABwDgMAiB4GA4DIDg4AAMPjAAHBAEwJgQBICQMDYADIGQMAiAwGBsDIEw4AAAfAAAHBAEwJgQBoCAMCIABAEQMAiAwGBEDIGA4AAAeAAAHBgEwNAQBoDAMCAABgEQMAiAwGBEDoDA4AAAIAAAHBwEwPAcBYBgMCAAAwEQMAiAwGBEDoBg4AAAAAAAHBAEwLAQBYAwMCAAAYEQMAiAwGBEDYAg/4AAAAAH/BAEwJAQBYCQMCIABIEQMAiAwGBEDYEwf8AAAAAP+BAEgJAQBICQMDYABIGwMA2AwGBsDYGwP4AAAAAH8BAHgJgcBIDwMBwAB4DgPAcAwGA4DIDg";

/**
 * Decode Base64 logo data to Uint8Array
 */
export function decodeLogo() {
  const binaryString = atob(LOGO_DATA_BASE64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

/**
 * Get logo pixel at position
 * @returns true if pixel is black
 */
export function getLogoPixel(logoData, x, y) {
  if (x < 0 || x >= LOGO_WIDTH || y < 0 || y >= LOGO_HEIGHT) {
    return false;
  }
  const byteIndex = y * LOGO_ROW_BYTES + Math.floor(x / 8);
  const bitIndex = 7 - (x % 8);
  return (logoData[byteIndex] & (1 << bitIndex)) !== 0;
}

export default {
  LOGO_WIDTH,
  LOGO_HEIGHT,
  LOGO_ROW_BYTES,
  LOGO_DATA_BASE64,
  decodeLogo,
  getLogoPixel,
};
