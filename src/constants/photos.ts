/**
 * سجل صور الصفحة الرئيسية. الصور الأربع الموجودة تُعاد استخدامها بقصّات مختلفة.
 * لإضافة صورة جديدة: ضعها في assets/images/home/ ثم غيّر السطر المقابل هنا (سطر واحد فقط).
 * مثال:  nablus: require('../../assets/images/home/nablus.jpg'),
 */
const jerusalem = require('../../assets/images/welcome/jerusalem.jpg');
const jaffa = require('../../assets/images/welcome/jaffa.jpg');
const acre = require('../../assets/images/welcome/acre.jpg');
const bethlehem = require('../../assets/images/welcome/bethlehem.jpg');

export const PHOTOS = {
  jerusalem,
  jaffa,
  acre,
  bethlehem,

  // ↓ مؤقتاً تستعمل صوراً موجودة، استبدلها بصور حقيقية لهذه المدن
  nablus: jaffa,
  hebron: bethlehem,
  jericho: acre,
};

export type PhotoKey = keyof typeof PHOTOS;