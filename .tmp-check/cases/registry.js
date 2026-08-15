// ===================================================================
// 暗流 — 案件注册表
// ===================================================================
import { caseData as qingwushan } from './qingwushan.js';
import { caseData as gumu }         from './gumu.js';
import { caseData as huaishu }      from './huaishu.js';
import { caseData as highway444 }   from './highway444.js';
import { caseData as ward }         from './ward.js';
import { caseData as fogport }      from './fogport.js';
import { caseData as snowtrain }    from './snowtrain.js';
import { caseData as theater }      from './theater.js';
import { caseData as library }      from './library.js';
import { caseData as belltower }    from './belltower.js';

/** 案件数据库 */
export const caseDB = {
  qingwushan,
  gumu,
  huaishu,
  highway444,
  ward,
  fogport,
  snowtrain,
  theater,
  library,
  belltower
};

/** 案件展示顺序 */
export const caseOrder = ['qingwushan', 'gumu', 'huaishu', 'highway444', 'ward', 'fogport', 'snowtrain', 'theater', 'library', 'belltower'];
