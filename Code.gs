const CONFIG = {
  SCL_SHEET: 'SCL MASTER',
  SALES_SHEET: 'SALES DATA BEATROUTE',
  ALIAS_SHEET: 'CUSTOMER ALIAS',
  DSPS: [1, 2, 3, 4]
};


// ======================================================
// WEB APP
// ======================================================

function doGet(e) {
  try {
    const p = (e && e.parameter) ? e.parameter : {};
    const action = String(p.action || 'ping');
    let data;

    switch (action) {
      case 'initial':
        data = getInitialData();
        break;
      case 'dashboard':
        data = getDashboardData(p.month, Number(p.dsp));
        break;
      case 'overview':
        data = getOverview(p.month);
        break;
      case 'exceptions':
        data = getAllExceptions(p.month);
        break;
      case 'ping':
        data = { ok: true, app: '818 DSP Sales & SCL Monitor' };
        break;
      default:
        throw new Error('Unknown API action: ' + action);
    }

    return jsonpResponse_(data, p.callback);
  } catch (err) {
    return jsonpResponse_({
      ok: false,
      error: err && err.message ? err.message : String(err)
    }, e && e.parameter ? e.parameter.callback : '');
  }
}

function jsonpResponse_(data, callback) {
  const json = JSON.stringify(data);
  const cb = String(callback || '');

  // JSONP is used so the GitHub Pages frontend can call Apps Script
  // without browser CORS problems.
  if (cb && /^[A-Za-z_$][0-9A-Za-z_$\.]*$/.test(cb)) {
    return ContentService
      .createTextOutput(cb + '(' + json + ');')
      .setMimeType(ContentService.MimeType.JAVASCRIPT);
  }

  return ContentService
    .createTextOutput(json)
    .setMimeType(ContentService.MimeType.JSON);
}


// ======================================================
// INITIAL DATA
// ======================================================

function getInitialData() {

  const ss =
    SpreadsheetApp.getActiveSpreadsheet();

  const salesSheet =
    ss.getSheetByName(
      CONFIG.SALES_SHEET
    );

  if (!salesSheet) {
    throw new Error(
      'SALES DATA BEATROUTE sheet not found.'
    );
  }

  const values =
    salesSheet
      .getDataRange()
      .getValues();

  const months =
    new Set();

  const tz =
    ss.getSpreadsheetTimeZone();


  for (
    let i = 1;
    i < values.length;
    i++
  ) {

    const d =
      toDate_(values[i][0]);

    if (!d) continue;

    months.add(
      Utilities.formatDate(
        d,
        tz,
        'yyyy-MM'
      )
    );
  }


  const monthList =
    Array.from(months)
      .sort()
      .reverse();


  return {

    months:
      monthList,

    defaultMonth:
      monthList[0] ||
      '2026-08',

    dsps:
      CONFIG.DSPS
  };
}


// ======================================================
// DASHBOARD
// ======================================================

function getDashboardData(
  monthKey,
  dspNo
) {

  const ss =
    SpreadsheetApp
      .getActiveSpreadsheet();

  const tz =
    ss.getSpreadsheetTimeZone();


  const sclSheet =
    ss.getSheetByName(
      CONFIG.SCL_SHEET
    );

  const salesSheet =
    ss.getSheetByName(
      CONFIG.SALES_SHEET
    );

  const aliasSheet =
    ss.getSheetByName(
      CONFIG.ALIAS_SHEET
    );


  if (!sclSheet) {
    throw new Error(
      'SCL MASTER sheet not found.'
    );
  }

  if (!salesSheet) {
    throw new Error(
      'SALES DATA BEATROUTE sheet not found.'
    );
  }


  const scl =
    sclSheet
      .getDataRange()
      .getValues();

  const sales =
    salesSheet
      .getDataRange()
      .getValues();

  const aliases =
    aliasSheet
      ? aliasSheet
          .getDataRange()
          .getValues()
      : [];


  const dsp =
    Number(dspNo);


  const startDate =
    monthStart_(
      monthKey
    );

  const endDate =
    monthEnd_(
      monthKey
    );


  const workingDays =
    countWorkingDays_(
      startDate,
      endDate
    );


  // ==================================================
  // CUSTOMER ALIAS MAP
  //
  // CUSTOMER ALIAS:
  // A TEMP SALES NAME
  // B ACTUAL CUSTOMER NAME
  // C DSP #
  // D REASON
  // E STATUS
  // ==================================================

  const aliasMap =
    {};


  aliases
    .slice(1)
    .forEach(r => {

      const tempName =
        clean_(r[0]);

      const actualName =
        clean_(r[1]);

      const aliasDSP =
        Number(r[2]);

      const reason =
        clean_(r[3]);

      const status =
        clean_(r[4]);


      if (
        !tempName ||
        !actualName
      ) {
        return;
      }


      aliasMap[
        normalize_(tempName)
      ] = {

        tempSalesName:
          tempName,

        actualCustomerName:
          actualName,

        dsp:
          aliasDSP || '',

        reason,

        status
      };
    });


  // ==================================================
  // SELECTED DSP SALES
  // ==================================================

  const filteredSales =
    sales
      .slice(1)
      .filter(r => {

        const date =
          toDate_(r[0]);

        const rowDSP =
          Number(r[13]);

        return (
          date &&
          rowDSP === dsp &&
          date >= startDate &&
          date <= endDate
        );
      });


  // ==================================================
  // LATEST SALES DATE
  // ==================================================

  let latestSalesDate =
    null;


  filteredSales
    .forEach(r => {

      const d =
        toDate_(r[0]);

      if (
        d &&
        (
          !latestSalesDate ||
          d > latestSalesDate
        )
      ) {

        latestSalesDate =
          d;
      }
    });


  // ==================================================
  // SELECTED DSP SCL
  // ==================================================

  const sclRows =
    scl
      .slice(1)
      .filter(
        r =>
          Number(r[0]) ===
          dsp
      );


  // ==================================================
  // MASTER SCL OWNERSHIP
  // ==================================================

  const masterMap =
    {};


  scl
    .slice(1)
    .forEach(r => {

      const ownerDSP =
        Number(r[0]);

      const customerName =
        clean_(r[2]);

      const beatrouteName =
        clean_(r[3]);


      if (!ownerDSP) {
        return;
      }


      const ownerData = {

        assignedDSP:
          ownerDSP,

        customerName,

        beatrouteName:
          isForRegister_(
            beatrouteName
          )
            ? ''
            : beatrouteName,

        notRegistered:
          isForRegister_(
            beatrouteName
          )
      };


      if (
        beatrouteName &&
        !isForRegister_(
          beatrouteName
        )
      ) {

        masterMap[
          normalize_(
            beatrouteName
          )
        ] = ownerData;
      }


      if (customerName) {

        const key =
          normalize_(
            customerName
          );

        if (
          !masterMap[key]
        ) {

          masterMap[key] =
            ownerData;
        }
      }
    });


  // ==================================================
  // RESOLVE SALES ROW
  //
  // Checks whether sale uses a temporary alias.
  // ==================================================

  function resolveSale_(row) {

    const salesCustomer =
      clean_(row[5]);

    const beatrouteCustomer =
      clean_(row[6]);


    const alias =
      aliasMap[
        normalize_(
          salesCustomer
        )
      ] ||
      aliasMap[
        normalize_(
          beatrouteCustomer
        )
      ];


    if (alias) {

      return {

        salesCustomer,

        beatrouteCustomer,

        actualCustomerName:
          alias.actualCustomerName,

        alias:

          alias,

        temporary:
          true
      };
    }


    return {

      salesCustomer,

      beatrouteCustomer,

      actualCustomerName:
        salesCustomer,

      alias:
        null,

      temporary:
        false
    };
  }


  // ==================================================
  // MAIN CUSTOMER PERFORMANCE
  // ==================================================

  const customers =
    sclRows
      .map(row => {

        const customerName =
          clean_(row[2]);

        const rawBRName =
          clean_(row[3]);


        const notRegistered =
          isForRegister_(
            rawBRName
          );


        const beatrouteName =
          notRegistered
            ? ''
            : rawBRName;


        let matched =
          [];


        filteredSales
          .forEach(r => {

            const resolved =
              resolveSale_(r);


            const directBRMatch =
              beatrouteName &&
              normalize_(
                resolved.beatrouteCustomer
              ) ===
              normalize_(
                beatrouteName
              );


            const directCustomerMatch =
              normalize_(
                resolved.salesCustomer
              ) ===
              normalize_(
                customerName
              );


            const aliasMatch =
              resolved.temporary &&
              normalize_(
                resolved.actualCustomerName
              ) ===
              normalize_(
                customerName
              );


            if (
              directBRMatch ||
              directCustomerMatch ||
              aliasMatch
            ) {

              matched.push(r);
            }
          });


        const dailyMap =
          {};


        const tempSalesNames =
          new Set();


        matched
          .forEach(r => {

            const resolved =
              resolveSale_(r);


            if (
              resolved.temporary &&
              resolved.alias
            ) {

              tempSalesNames.add(
                resolved.alias
                  .tempSalesName
              );
            }


            const d =
              toDate_(r[0]);

            if (!d) {
              return;
            }


            const key =
              Utilities.formatDate(
                d,
                tz,
                'yyyy-MM-dd'
              );


            if (
              !dailyMap[key]
            ) {

              dailyMap[key] =
                0;
            }


            dailyMap[key] +=
              number_(r[10]);
          });


        const dates =
          Object
            .keys(
              dailyMap
            )
            .sort();


        const dailyOrders =
          dates
            .map(key => ({

              date:
                formatDate_(
                  new Date(
                    key +
                    'T00:00:00'
                  ),
                  tz
                ),

              kg:
                round2_(
                  dailyMap[key]
                )
            }));


        const orderDays =
          dates.length;


        const actualKg =
          round2_(

            matched.reduce(
              (sum, r) =>
                sum +
                number_(r[10]),
              0
            )
          );


        const frequency =
          clean_(row[6]);


        const freqNo =
          frequencyNumber_(
            frequency
          );


        const targetDays =
          freqNo

            ? Math.round(
                workingDays *
                (
                  freqNo /
                  6
                )
              )

            : 0;


        let status =
          'NO ORDER';


        if (
          orderDays > 0
        ) {

          status =
            orderDays >=
            targetDays

              ? 'ON TARGET'

              : 'BELOW TARGET';
        }


        return {

          no:
            row[1],

          dsp,

          customerName,

          beatrouteName,

          notRegistered,

          address:
            clean_(row[4]),

          outletType:
            clean_(row[5]),

          frequency,

          adsKg:
            number_(row[7]),

          targetDays,

          orderDays,

          actualKg,

          temporarySalesNames:
            Array.from(
              tempSalesNames
            ),

          lastOrder:
            dates.length

              ? formatDate_(
                  new Date(
                    dates[
                      dates.length - 1
                    ] +
                    'T00:00:00'
                  ),
                  tz
                )

              : '-',

          served:
            orderDays > 0,

          status,

          dailyOrders
        };
      });


  // ==================================================
  // EXCEPTION MAPS
  // ==================================================

  const jumpedMap =
    {};

  const newMap =
    {};

  const notRegisteredMap =
    {};

  const temporaryMap =
    {};


  // ==================================================
  // SCL CUSTOMERS MARKED FOR REGISTRATION
  // ==================================================

  sclRows
    .forEach(r => {

      const customerName =
        clean_(r[2]);

      const beatrouteName =
        clean_(r[3]);


      if (
        !customerName ||
        !isForRegister_(
          beatrouteName
        )
      ) {
        return;
      }


      const key =
        normalize_(
          customerName
        );


      notRegisteredMap[key] = {

        customerName,

        beatrouteName:
          '',

        assignedDSP:
          dsp,

        sellingDSP:
          '',

        tempSalesName:
          '',

        kg:
          0,

        dates:
          new Set()
      };
    });


  // ==================================================
  // PROCESS SALES
  // ==================================================

  filteredSales
    .forEach(r => {

      const resolved =
        resolveSale_(r);


      const salesCustomer =
        resolved.salesCustomer;

      const beatrouteCustomer =
        resolved.beatrouteCustomer;

      const brid =
        clean_(r[7]);

      const kg =
        number_(r[10]);


      const d =
        toDate_(r[0]);


      const dateKey =
        d

          ? Utilities.formatDate(
              d,
              tz,
              'yyyy-MM-dd'
            )

          : '';


      // ==================================================
      // TEMPORARY SALES MAPPING
      // ==================================================

      if (
        resolved.temporary &&
        resolved.alias
      ) {

        const alias =
          resolved.alias;


        const actualName =
          alias.actualCustomerName;


        const owner =
          masterMap[
            normalize_(
              actualName
            )
          ];


        const assignedDSP =
          owner
            ? owner.assignedDSP
            : alias.dsp;


        const key =
          normalize_(
            actualName
          ) +
          '_TEMP_' +
          normalize_(
            alias.tempSalesName
          );


        if (
          !temporaryMap[key]
        ) {

          temporaryMap[key] = {

            customerName:
              actualName,

            beatrouteName:
              owner
                ? owner.beatrouteName
                : '',

            assignedDSP:
              assignedDSP || '',

            sellingDSP:
              dsp,

            tempSalesName:
              alias.tempSalesName,

            reason:
              alias.reason,

            status:
              alias.status,

            kg:
              0,

            dates:
              new Set()
          };
        }


        temporaryMap[key].kg +=
          kg;


        if (dateKey) {

          temporaryMap[key]
            .dates
            .add(dateKey);
        }


        // If real customer is not registered,
        // also update registration exception.
        if (
          owner &&
          owner.notRegistered
        ) {

          const regKey =
            normalize_(
              actualName
            );


          if (
            !notRegisteredMap[
              regKey
            ]
          ) {

            notRegisteredMap[
              regKey
            ] = {

              customerName:
                actualName,

              beatrouteName:
                '',

              assignedDSP:
                assignedDSP || '',

              sellingDSP:
                dsp,

              tempSalesName:
                alias.tempSalesName,

              kg:
                0,

              dates:
                new Set()
            };
          }


          notRegisteredMap[
            regKey
          ].sellingDSP =
            dsp;


          notRegisteredMap[
            regKey
          ].tempSalesName =
            alias.tempSalesName;


          notRegisteredMap[
            regKey
          ].kg +=
            kg;


          if (dateKey) {

            notRegisteredMap[
              regKey
            ]
            .dates
            .add(dateKey);
          }
        }


        // If assigned to another DSP,
        // it's also a jumped customer.
        if (
          assignedDSP &&
          Number(
            assignedDSP
          ) !== dsp
        ) {

          const jumpKey =
            normalize_(
              actualName
            ) +
            '_OWNER_' +
            assignedDSP;


          if (
            !jumpedMap[
              jumpKey
            ]
          ) {

            jumpedMap[
              jumpKey
            ] = {

              customerName:
                actualName,

              beatrouteName:
                owner
                  ? owner.beatrouteName
                  : '',

              assignedDSP:
                Number(
                  assignedDSP
                ),

              sellingDSP:
                dsp,

              tempSalesName:
                alias.tempSalesName,

              kg:
                0,

              dates:
                new Set()
            };
          }


          jumpedMap[
            jumpKey
          ].kg += kg;


          if (dateKey) {

            jumpedMap[
              jumpKey
            ]
            .dates
            .add(dateKey);
          }
        }


        // Critical:
        // alias sale should NEVER become
        // New / Unassigned.
        return;
      }


      // ==================================================
      // SALES-DATA REGISTRATION ISSUE
      // ==================================================

      if (
        salesCustomer &&
        (
          !beatrouteCustomer ||
          !brid
        )
      ) {

        const key =
          normalize_(
            salesCustomer
          );


        if (
          !notRegisteredMap[
            key
          ]
        ) {

          const owner =
            masterMap[key];


          notRegisteredMap[
            key
          ] = {

            customerName:
              salesCustomer,

            beatrouteName:
              '',

            assignedDSP:
              owner
                ? owner.assignedDSP
                : '',

            sellingDSP:
              dsp,

            tempSalesName:
              '',

            kg:
              0,

            dates:
              new Set()
          };
        }


        notRegisteredMap[
          key
        ].sellingDSP =
          dsp;


        notRegisteredMap[
          key
        ].kg +=
          kg;


        if (dateKey) {

          notRegisteredMap[
            key
          ]
          .dates
          .add(dateKey);
        }


        return;
      }


      // ==================================================
      // FIND SCL OWNER
      // ==================================================

      const owner =
        masterMap[
          normalize_(
            beatrouteCustomer
          )
        ] ||
        masterMap[
          normalize_(
            salesCustomer
          )
        ];


      // Normal customer.
      if (
        owner &&
        Number(
          owner.assignedDSP
        ) === dsp
      ) {

        return;
      }


      // ==================================================
      // JUMPED CUSTOMER
      // ==================================================

      if (
        owner &&
        Number(
          owner.assignedDSP
        ) !== dsp
      ) {

        const key =
          normalize_(
            beatrouteCustomer ||
            salesCustomer
          ) +
          '_OWNER_' +
          owner.assignedDSP;


        if (
          !jumpedMap[key]
        ) {

          jumpedMap[key] = {

            customerName:
              salesCustomer ||
              owner.customerName,

            beatrouteName:
              beatrouteCustomer ||
              owner.beatrouteName,

            assignedDSP:
              Number(
                owner.assignedDSP
              ),

            sellingDSP:
              dsp,

            tempSalesName:
              '',

            kg:
              0,

            dates:
              new Set()
          };
        }


        jumpedMap[key].kg +=
          kg;


        if (dateKey) {

          jumpedMap[key]
            .dates
            .add(dateKey);
        }


        return;
      }


      // ==================================================
      // NEW / UNASSIGNED CUSTOMER
      // ==================================================

      const key =
        normalize_(
          beatrouteCustomer ||
          salesCustomer
        );


      if (!key) {
        return;
      }


      if (
        !newMap[key]
      ) {

        newMap[key] = {

          customerName:
            salesCustomer,

          beatrouteName:
            beatrouteCustomer,

          assignedDSP:
            '',

          sellingDSP:
            dsp,

          tempSalesName:
            '',

          kg:
            0,

          dates:
            new Set()
        };
      }


      newMap[key].kg +=
        kg;


      if (dateKey) {

        newMap[key]
          .dates
          .add(dateKey);
      }
    });


  // ==================================================
  // ARRAYS
  // ==================================================

  const jumpedCustomers =
    mapExceptionArray_(
      jumpedMap,
      tz
    );


  const newCustomers =
    mapExceptionArray_(
      newMap,
      tz
    );


  const notRegistered =
    mapExceptionArray_(
      notRegisteredMap,
      tz
    );


  const temporaryMappings =
    mapExceptionArray_(
      temporaryMap,
      tz
    );


  // ==================================================
  // SUMMARY
  // ==================================================

  const served =
    customers.filter(
      c => c.served
    ).length;


  const notServed =
    customers.length -
    served;


  const onTarget =
    customers.filter(
      c =>
        c.status ===
        'ON TARGET'
    ).length;


  const belowTarget =
    customers.filter(
      c =>
        c.status ===
        'BELOW TARGET'
    ).length;


  const dspSalesKg =
    round2_(

      filteredSales.reduce(
        (sum, r) =>
          sum +
          number_(r[10]),
        0
      )
    );


  return {

    month:
      monthKey,

    monthLabel:
      monthLabel_(
        monthKey
      ),

    dsp,

    workingDays,

    latestSalesDate:
      latestSalesDate

        ? formatDate_(
            latestSalesDate,
            tz
          )

        : '-',


    summary: {

      sclCustomers:
        customers.length,

      served,

      notServed,

      serviceRate:
        customers.length

          ? round2_(
              (
                served /
                customers.length
              ) *
              100
            )

          : 0,

      onTarget,

      belowTarget,

      dspSalesKg,

      jumpedCustomers:
        jumpedCustomers.length,

      newCustomers:
        newCustomers.length,

      notRegistered:
        notRegistered.length,

      temporaryMappings:
        temporaryMappings.length
    },


    customers,

    jumpedCustomers,

    newCustomers,

    notRegistered,

    temporaryMappings
  };
}


// ======================================================
// OVERVIEW
// ======================================================

function getOverview(
  monthKey
) {

  return CONFIG.DSPS
    .map(dsp => {

      const d =
        getDashboardData(
          monthKey,
          dsp
        );


      return {

        dsp,

        sclCustomers:
          d.summary.sclCustomers,

        served:
          d.summary.served,

        notServed:
          d.summary.notServed,

        serviceRate:
          d.summary.serviceRate,

        onTarget:
          d.summary.onTarget,

        belowTarget:
          d.summary.belowTarget,

        actualKg:
          d.summary.dspSalesKg,

        jumped:
          d.summary.jumpedCustomers,

        newCustomers:
          d.summary.newCustomers,

        notRegistered:
          d.summary.notRegistered,

        temporaryMappings:
          d.summary.temporaryMappings,

        exceptions:
          d.summary.jumpedCustomers +
          d.summary.newCustomers +
          d.summary.notRegistered +
          d.summary.temporaryMappings
      };
    });
}


// ======================================================
// ALL EXCEPTIONS
// ======================================================

function getAllExceptions(
  monthKey
) {

  const jumped =
    [];

  const newCustomers =
    [];

  const notRegistered =
    [];

  const temporaryMappings =
    [];


  CONFIG.DSPS
    .forEach(dsp => {

      const d =
        getDashboardData(
          monthKey,
          dsp
        );


      jumped.push(
        ...d.jumpedCustomers
      );


      newCustomers.push(
        ...d.newCustomers
      );


      notRegistered.push(
        ...d.notRegistered
      );


      temporaryMappings.push(
        ...d.temporaryMappings
      );
    });


  return {

    month:
      monthKey,

    monthLabel:
      monthLabel_(
        monthKey
      ),

    jumpedCustomers:
      jumped,

    newCustomers,

    notRegistered,

    temporaryMappings
  };
}


// ======================================================
// EXCEPTION HELPER
// ======================================================

function mapExceptionArray_(
  map,
  tz
) {

  return Object
    .values(map)
    .map(x => {

      const dates =
        Array.from(
          x.dates
        ).sort();


      return {

        customerName:
          x.customerName ||
          '',

        beatrouteName:
          x.beatrouteName ||
          '',

        assignedDSP:
          x.assignedDSP ||
          '',

        sellingDSP:
          x.sellingDSP ||
          '',

        tempSalesName:
          x.tempSalesName ||
          '',

        reason:
          x.reason ||
          '',

        status:
          x.status ||
          '',

        orderDays:
          dates.length,

        actualKg:
          round2_(
            x.kg
          ),

        lastOrder:
          dates.length

            ? formatDate_(
                new Date(
                  dates[
                    dates.length - 1
                  ] +
                  'T00:00:00'
                ),
                tz
              )

            : '-'
      };
    })
    .sort(
      (a,b) =>
        b.actualKg -
        a.actualKg
    );
}


// ======================================================
// HELPERS
// ======================================================

function clean_(value) {

  return String(
    value == null
      ? ''
      : value
  ).trim();
}


function normalize_(value) {

  return clean_(value)
    .toUpperCase()
    .replace(
      /\s+/g,
      ' '
    )
    .trim();
}


function isForRegister_(value) {

  return clean_(value)
    .toUpperCase()
    .includes(
      'FOR REGISTER'
    );
}


function number_(value) {

  const n =
    Number(value);

  return isNaN(n)
    ? 0
    : n;
}


function round2_(n) {

  return Math.round(
    (
      Number(n) +
      Number.EPSILON
    ) *
    100
  ) / 100;
}


function toDate_(value) {

  if (
    value instanceof Date &&
    !isNaN(value)
  ) {

    return value;
  }


  if (!value) {

    return null;
  }


  const d =
    new Date(value);


  return isNaN(d)
    ? null
    : d;
}


function monthStart_(
  monthKey
) {

  const [y,m] =
    monthKey
      .split('-')
      .map(Number);


  return new Date(
    y,
    m - 1,
    1,
    0,
    0,
    0
  );
}


function monthEnd_(
  monthKey
) {

  const [y,m] =
    monthKey
      .split('-')
      .map(Number);


  return new Date(
    y,
    m,
    0,
    23,
    59,
    59
  );
}


function monthLabel_(
  monthKey
) {

  const [y,m] =
    monthKey
      .split('-')
      .map(Number);


  return Utilities
    .formatDate(
      new Date(
        y,
        m - 1,
        1
      ),
      'Asia/Manila',
      'MMMM yyyy'
    );
}


function formatDate_(
  date,
  tz
) {

  return Utilities
    .formatDate(
      date,
      tz,
      'MMM d, yyyy'
    );
}


function frequencyNumber_(
  freq
) {

  const m =
    String(
      freq || ''
    )
    .toUpperCase()
    .match(
      /F(\d+)/
    );


  return m
    ? Number(m[1])
    : 0;
}


function countWorkingDays_(
  startDate,
  endDate
) {

  let count =
    0;


  const d =
    new Date(
      startDate
    );


  while (
    d <= endDate
  ) {

    if (
      d.getDay() !== 0
    ) {

      count++;
    }


    d.setDate(
      d.getDate() + 1
    );
  }


  return count;
}