// ===================================================================
// 暗流 — 案件注册表
// ===================================================================
import { caseData as qingwushan } from './qingwushan.js?v=20260830';
import { caseData as gumu }         from './gumu.js?v=20260830';
import { caseData as huaishu }      from './huaishu.js?v=20260830';
import { caseData as highway444 }   from './highway444.js?v=20260830';
import { caseData as ward }         from './ward.js?v=20260830';
import { caseData as fogport }      from './fogport.js?v=20260830';
import { caseData as snowtrain }    from './snowtrain.js?v=20260830';
import { caseData as theater }      from './theater.js?v=20260830';
import { caseData as library }      from './library.js?v=20260830';
import { caseData as belltower }    from './belltower.js?v=20260830';
import { caseData as fairground }   from './fairground.js?v=20260830';

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
  belltower,
  fairground
};

/** 案件展示顺序 */
export const caseOrder = ['qingwushan', 'gumu', 'huaishu', 'highway444', 'ward', 'fogport', 'snowtrain', 'theater', 'library', 'belltower', 'fairground'];
