/* بيانات تجريبية واقعية — شركات سعودية. كل الشاشات بتقرا من هنا. */


  export const org = {
    nameAr: 'ويب سكويدز',
    nameEn: 'Web Squids LLC',
    branch: 'فرع الرياض، العليا',
    vat: '399999999900003',
    cr: '1029239333',
    zatca: 'متصل ببيئة المحاكاة'
  };

  export const user = { nameAr: 'مهاب هاني', initials: 'مه', role: 'مدير الحساب', photo: '/user.jpg' };
  /* photo: حطّ مسار صورة في public/ زي '/me.jpg' وهتظهر بدل الحروف */

  export const customers = [
    { id:'C-1041', ar:'مؤسسة النخبة للتجارة',        en:'Al Nokhba Trading Est.',      vat:'310245778900003', city:'الرياض', terms:'صافي 30 يوم', balance:  12450.00, docs:14, phone:'+966 55 214 8890' },
    { id:'C-1038', ar:'شركة الفهد للمقاولات',         en:'Al Fahd Contracting Co.',     vat:'311908442100003', city:'الرياض', terms:'صافي 10 أيام', balance: 84300.00, docs:27, phone:'+966 50 771 3320' },
    { id:'C-1036', ar:'مصنع الرياض للبلاستيك',        en:'Riyadh Plastics Factory',     vat:'302118773400003', city:'الخرج',  terms:'صافي 30 يوم', balance:  5780.50, docs: 9, phone:'+966 53 408 1177' },
    { id:'C-1033', ar:'مؤسسة درب الشرق للتوريدات',    en:'Darb Al Sharq Supplies Est.', vat:'309887221000003', city:'الدمام', terms:'صافي 45 يوم', balance: 23900.00, docs:18, phone:'+966 56 992 4471' },
    { id:'C-1029', ar:'شركة نسيج الحديثة',            en:'Naseej Modern Co.',           vat:'304451900700003', city:'جدة',    terms:'عند الاستلام', balance: 1240.00, docs: 6, phone:'+966 54 330 6612' },
    { id:'C-1024', ar:'مؤسسة البناء المتين',          en:'Al Binaa Al Mateen Est.',     vat:'308774112200003', city:'الرياض', terms:'صافي 30 يوم', balance: 46015.75, docs:11, phone:'+966 55 887 2204' },
    { id:'C-1021', ar:'مؤسسة وادي القمم للتقنية',     en:'Wadi Al Qimam Tech Est.',     vat:'305612889400003', city:'الرياض', terms:'صافي 15 يوم', balance: 43110.00, docs:22, phone:'+966 59 114 7758' },
    { id:'C-1017', ar:'شركة أصالة للأثاث المكتبي',    en:'Asalah Office Furniture Co.', vat:'301990554300003', city:'جدة',    terms:'صافي 30 يوم', balance:     0.00, docs:31, phone:'+966 55 660 9931' },
    { id:'C-1012', ar:'شركة الخليج للتوريدات الطبية', en:'Gulf Medical Supplies Co.',   vat:'307223118800003', city:'الدمام', terms:'صافي 60 يوم', balance:  9325.00, docs:15, phone:'+966 50 448 2216' },
    { id:'C-1008', ar:'مجموعة الأفق التجارية',        en:'Al Ufuq Commercial Group',    vat:'303445677900003', city:'الرياض', terms:'صافي 30 يوم', balance: 67400.00, docs:40, phone:'+966 55 019 3345' },
    { id:'C-1004', ar:'مؤسسة الصهباء للخدمات',        en:'Al Sahba Services Est.',      vat:'306118990200003', city:'مكة',    terms:'عند الاستلام', balance: 4180.00, docs: 7, phone:'+966 58 227 0043' },
    { id:'C-1001', ar:'شركة برج النخيل العقارية',     en:'Burj Al Nakheel Realty Co.',  vat:'300771224500003', city:'الرياض', terms:'صافي 45 يوم', balance: 12900.00, docs:13, phone:'+966 55 903 8871' }
  ];

  const cust = i => customers[i];

  // status: draft | issued | partial | paid | overdue | void | cancelled
  // zatca : null | 'ok' | 'bad' | 'pending'
  export const invoices = [
    { no:'INV-027122', c:cust(0),  date:'2026-08-14', due:'2026-09-13', total: 12450.00, paid:12450.00, status:'paid',    zatca:'ok'  },
    { no:'INV-027121', c:cust(1),  date:'2026-07-18', due:'2026-07-28', total: 84300.00, paid:    0.00, status:'overdue', zatca:'ok',  overdueDays:20 },
    { no:'INV-027120', c:cust(2),  date:'2026-08-11', due:'2026-09-10', total:  5780.50, paid: 5780.50, status:'paid',    zatca:'bad', zatcaReason:'الرقم الضريبي للعميل غير صالح' },
    { no:'INV-027119', c:cust(3),  date:'2026-08-09', due:'2026-09-23', total: 23900.00, paid:14340.00, status:'partial', zatca:'ok'  },
    { no:'INV-027118', c:cust(4),  date:'2026-08-06', due:'2026-09-05', total:  1240.00, paid:    0.00, status:'issued',  zatca:'ok'  },
    { no:'INV-027117', c:cust(5),  date:'2026-08-04', due:null,         total: 46015.75, paid:    0.00, status:'draft',   zatca:null  },
    { no:'INV-027116', c:cust(8),  date:'2026-07-29', due:'2026-09-27', total:  9325.00, paid:    0.00, status:'cancelled', zatca:null },
    { no:'INV-027115', c:cust(6),  date:'2026-07-26', due:'2026-08-10', total: 43110.00, paid:    0.00, status:'overdue', zatca:'ok',  overdueDays:7 },
    { no:'INV-027114', c:cust(7),  date:'2026-07-22', due:'2026-08-21', total: 18760.25, paid:18760.25, status:'paid',    zatca:'ok'  },
    { no:'INV-027113', c:cust(9),  date:'2026-07-19', due:'2026-08-18', total: 67400.00, paid:20000.00, status:'partial', zatca:'ok'  },
    { no:'INV-027112', c:cust(10), date:'2026-07-15', due:'2026-07-15', total:  4180.00, paid: 4180.00, status:'paid',    zatca:'ok'  },
    { no:'INV-027111', c:cust(11), date:'2026-07-11', due:'2026-08-25', total: 12900.00, paid:    0.00, status:'issued',  zatca:'pending' },
    { no:'INV-027110', c:cust(0),  date:'2026-07-08', due:null,         total:  8900.00, paid:    0.00, status:'draft',   zatca:null  },
    { no:'INV-027109', c:cust(3),  date:'2026-07-02', due:'2026-08-16', total: 31200.00, paid:31200.00, status:'paid',    zatca:'ok'  },
    { no:'INV-027108', c:cust(4),  date:'2026-06-28', due:'2026-07-28', total:  2450.00, paid:    0.00, status:'void',    zatca:'ok'  }
  ];

  // status: draft | sent | accepted | rejected | expired | converted | cancelled
  export const quotations = [
    { no:'QUO-004412', c:cust(1),  date:'2026-08-12', valid:'2026-09-11', total: 96500.00, status:'sent'      },
    { no:'QUO-004411', c:cust(9),  date:'2026-08-10', valid:'2026-08-24', total:145000.00, status:'accepted'  },
    { no:'QUO-004410', c:cust(5),  date:'2026-08-07', valid:'2026-09-06', total: 46015.75, status:'draft'     },
    { no:'QUO-004409', c:cust(2),  date:'2026-08-02', valid:'2026-08-16', total: 12300.00, status:'expired'   },
    { no:'QUO-004408', c:cust(6),  date:'2026-07-30', valid:'2026-08-29', total: 43110.00, status:'converted', linked:'INV-027115' },
    { no:'QUO-004407', c:cust(0),  date:'2026-07-25', valid:'2026-08-24', total:  7800.00, status:'rejected'  },
    { no:'QUO-004406', c:cust(3),  date:'2026-07-21', valid:'2026-08-20', total: 23900.00, status:'converted', linked:'INV-027119' },
    { no:'QUO-004405', c:cust(8),  date:'2026-07-16', valid:'2026-07-31', total: 15400.00, status:'cancelled' },
    { no:'QUO-004404', c:cust(10), date:'2026-07-12', valid:'2026-08-11', total:  4180.00, status:'sent'      },
    { no:'QUO-004403', c:cust(7),  date:'2026-07-05', valid:'2026-08-04', total: 62000.00, status:'accepted'  }
  ];

  // إشعارات دائنة — تقلّل ما على العميل
  export const creditNotes = [
    { no:'CN-000318', c:cust(2),  date:'2026-08-13', src:'INV-027120', total: 1780.50, status:'issued', zatca:'ok',  reason:'مرتجع بضاعة' },
    { no:'CN-000317', c:cust(3),  date:'2026-08-08', src:'INV-027119', total: 3900.00, status:'issued', zatca:'ok',  reason:'خصم تجاري لاحق' },
    { no:'CN-000316', c:cust(1),  date:'2026-08-03', src:'INV-027121', total:12000.00, status:'draft',  zatca:null,  reason:'تسوية كمية' },
    { no:'CN-000315', c:cust(9),  date:'2026-07-27', src:'INV-027113', total: 5400.00, status:'issued', zatca:'bad', zatcaReason:'مرجع الفاتورة الأصلية غير موجود', reason:'خطأ في السعر' },
    { no:'CN-000314', c:cust(7),  date:'2026-07-20', src:'INV-027114', total: 1260.25, status:'issued', zatca:'ok',  reason:'مرتجع جزئي' },
    { no:'CN-000313', c:cust(4),  date:'2026-07-09', src:'INV-027118', total:  240.00, status:'void',   zatca:'ok',  reason:'أُلغي' }
  ];

  // إشعارات مدينة — تزوّد ما على العميل
  export const debitNotes = [
    { no:'DN-000094', c:cust(1),  date:'2026-08-15', src:'INV-027121', total: 4500.00, status:'issued', zatca:'ok',  reason:'رسوم شحن إضافية' },
    { no:'DN-000093', c:cust(9),  date:'2026-08-05', src:'INV-027113', total: 2100.00, status:'issued', zatca:'ok',  reason:'فرق سعر صرف' },
    { no:'DN-000092', c:cust(6),  date:'2026-07-28', src:'INV-027115', total:  890.00, status:'draft',  zatca:null,  reason:'رسوم تأخير سداد' },
    { no:'DN-000091', c:cust(0),  date:'2026-07-14', src:'INV-027122', total: 1350.00, status:'issued', zatca:'pending', reason:'خدمة تركيب إضافية' }
  ];

  export const attention = [
    { level:'critical', text:'فواتير مرفوضة من هيئة الزكاة والضريبة',  count:2, amount: 11180.50, go:'invoices.html' },
    { level:'critical', text:'فواتير تجاوزت تاريخ الاستحقاق',          count:2, amount:127410.00, go:'invoices.html' },
    { level:'warn',     text:'عروض أسعار تنتهي صلاحيتها خلال أسبوع',   count:3, amount: 46000.00, go:'quotations.html' },
    { level:'warn',     text:'مسودات لم تُصدَر منذ أكثر من 14 يوم',     count:2, amount: 54915.75, go:'invoices.html' }
  ];
