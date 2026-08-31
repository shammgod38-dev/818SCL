/* =========================================================
GITHUB -> GOOGLE APPS SCRIPT API
Paste your deployed Apps Script /exec URL below.
========================================================= */

const API_URL = 'PASTE_YOUR_APPS_SCRIPT_EXEC_URL_HERE';

function apiCall(action, params = {}) {
  return new Promise((resolve, reject) => {
    if (!API_URL || API_URL.includes('PASTE_YOUR')) {
      reject(new Error('Paste your Apps Script /exec URL into API_URL in app.js first.'));
      return;
    }

    const callback = '__818cb_' + Date.now() + '_' + Math.random().toString(36).slice(2);
    const query = new URLSearchParams({ action, ...params, callback });
    const script = document.createElement('script');
    let timer;

    window[callback] = data => {
      clearTimeout(timer);
      delete window[callback];
      script.remove();
      if (data && data.ok === false && data.error) reject(new Error(data.error));
      else resolve(data);
    };

    script.onerror = () => {
      clearTimeout(timer);
      delete window[callback];
      script.remove();
      reject(new Error('Could not connect to the 818 Google Sheets API.'));
    };

    timer = setTimeout(() => {
      delete window[callback];
      script.remove();
      reject(new Error('API request timed out.'));
    }, 30000);

    script.src = API_URL + '?' + query.toString();
    document.body.appendChild(script);
  });
}

/* =========================================================
FORCE TRUE MOBILE MODE
========================================================= */

(function detectMobileDevice() {

  const ua =
    navigator.userAgent ||
    navigator.vendor ||
    window.opera ||
    '';


  const mobileUA =
    /Android|iPhone|iPad|iPod|Mobile|IEMobile|Opera Mini/i
      .test(ua);


  const smallScreen =
    Math.min(
      window.screen.width,
      window.screen.height
    ) <= 900;


  const touchDevice =
    navigator.maxTouchPoints > 1;


  if (
    mobileUA ||
    (
      smallScreen &&
      touchDevice
    )
  ) {

    document.documentElement
      .classList
      .add(
        'mobile-device'
      );
  }

})();


let CURRENT_MONTH =
  '';

let CURRENT_DSP =
  4;

let CURRENT_PAGE =
  'dsp';

let CURRENT_DATA =
  null;


/* =========================================================
INIT
========================================================= */

document.addEventListener(
  'DOMContentLoaded',
  init
);


function init() {

  loading(true);


  apiCall('initial')
    .then(data => {


        const select =
          document.getElementById(
            'monthSelect'
          );


        select.innerHTML =
          data.months
            .map(m => `

              <option
                value="${m}">

                ${monthLabel(m)}

              </option>

            `)
            .join('');


        CURRENT_MONTH =
          data.defaultMonth;


        select.value =
          CURRENT_MONTH;


        loadDSP(4);
      })
    .catch(showError);
}


/* =========================================================
NAVIGATION
========================================================= */

function changeMonth() {

  CURRENT_MONTH =
    document
      .getElementById(
        'monthSelect'
      )
      .value;


  refreshCurrent();
}


function refreshCurrent() {

  if (
    CURRENT_PAGE ===
    'overview'
  ) {

    loadOverview();

    return;
  }


  if (
    CURRENT_PAGE ===
    'exceptions'
  ) {

    loadAllExceptions();

    return;
  }


  loadDSP(
    CURRENT_DSP
  );
}


function setDesktopActive(
  button
) {

  document
    .querySelectorAll(
      '.nav-btn'
    )
    .forEach(
      b =>
        b.classList.remove(
          'active'
        )
    );


  if (button) {

    button
      .classList
      .add(
        'active'
      );
  }
}


function setMobileActive(
  button
) {

  document
    .querySelectorAll(
      '.mobile-nav-btn'
    )
    .forEach(
      b =>
        b.classList.remove(
          'active'
        )
    );


  if (button) {

    button
      .classList
      .add(
        'active'
      );
  }
}


function openDSP(
  dsp,
  button
) {

  CURRENT_DSP =
    dsp;

  CURRENT_PAGE =
    'dsp';


  setDesktopActive(
    button
  );


  loadDSP(
    dsp
  );
}


function openOverview(
  button
) {

  CURRENT_PAGE =
    'overview';


  setDesktopActive(
    button
  );


  loadOverview();
}


function openAllExceptions(
  button
) {

  CURRENT_PAGE =
    'exceptions';


  setDesktopActive(
    button
  );


  loadAllExceptions();
}


function mobileDSP(
  dsp,
  button
) {

  CURRENT_DSP =
    dsp;

  CURRENT_PAGE =
    'dsp';


  setMobileActive(
    button
  );


  loadDSP(
    dsp
  );


  window.scrollTo(
    {
      top:0,
      behavior:'smooth'
    }
  );
}


function mobileOverview(
  button
) {

  CURRENT_PAGE =
    'overview';


  setMobileActive(
    button
  );


  loadOverview();


  window.scrollTo(
    {
      top:0,
      behavior:'smooth'
    }
  );
}


function mobileExceptions(
  button
) {

  CURRENT_PAGE =
    'exceptions';


  setMobileActive(
    button
  );


  loadAllExceptions();


  window.scrollTo(
    {
      top:0,
      behavior:'smooth'
    }
  );
}


/* =========================================================
LOAD DSP
========================================================= */

function loadDSP(
  dsp
) {

  loading(true);


  apiCall('dashboard', { month: CURRENT_MONTH, dsp: dsp })
    .then(data => {


        CURRENT_DATA =
          data;


        renderDSP(
          data
        );


        loading(false);
      })
    .catch(showError);
}


/* =========================================================
DSP PAGE
========================================================= */

function renderDSP(
  data
) {

  const s =
    data.summary;


  if (
    !s.sclCustomers
  ) {

    document.getElementById(
      'content'
    ).innerHTML = `


      <div class="page-head">

        <div>

          <h1>
            DSP ${data.dsp}
          </h1>

          <p>
            ${data.monthLabel}
          </p>

        </div>

      </div>


      <div class="panel">

        <div class="empty">

          <strong>
            No SCL data available
          </strong>

          Add DSP ${data.dsp}
          customers to
          SCL MASTER.

        </div>

      </div>

    `;


    return;
  }


  document.getElementById(
    'content'
  ).innerHTML = `


    <div class="page-head">


      <div>

        <h1>

          DSP ${data.dsp}

        </h1>


        <p>

          ${data.monthLabel}

          • ${data.workingDays}
          working days

          ${
            data.latestSalesDate !== '-'

              ? ` • Sales through
                 ${data.latestSalesDate}`

              : ''
          }

        </p>

      </div>


      <div class="period-pill">

        ${data.monthLabel}

      </div>


    </div>


    <div class="hero-grid">


      ${heroCard(
        'SCL Customers',
        s.sclCustomers,
        'Assigned customers'
      )}


      ${heroCard(
        'Served Customers',
        s.served,
        s.serviceRate +
        '% service rate'
      )}


      ${heroCard(
        'Not Served',
        s.notServed,
        'No order in period',
        'red'
      )}


      ${heroCard(
        'Total Sales Volume',
        kg(
          s.dspSalesKg
        ),
        'DSP ' +
        data.dsp +
        ' total sales'
      )}


    </div>


    <div class="status-strip">


      ${statusBox(
        'On Target',
        s.onTarget,
        'green'
      )}


      ${statusBox(
        'Below Target',
        s.belowTarget,
        'yellow'
      )}


      ${statusBox(
        'Jumped',
        s.jumpedCustomers,
        'purple'
      )}


      ${statusBox(
        'New / Unassigned',
        s.newCustomers,
        'orange'
      )}


      ${statusBox(
        'Not Registered',
        s.notRegistered,
        'red'
      )}


      ${statusBox(
        'Temp Mapping',
        s.temporaryMappings,
        'blue'
      )}


    </div>


    <div class="panel">


      <div class="panel-head">


        <div>

          <div class=
            "panel-title">

            SCL Customer Performance

          </div>

          <div class=
            "panel-sub">

            Customer Name /
            BeatRoute Name

          </div>

        </div>


        <div class=
          "panel-controls">


          <input
            id="customerSearch"
            class="search"
            placeholder=
            "Search customer..."
            oninput=
            "filterCustomers()">


          <select
            id="statusFilter"
            onchange=
            "filterCustomers()">

            <option value="ALL">

              All Status

            </option>

            <option value="ON TARGET">

              On Target

            </option>

            <option value="BELOW TARGET">

              Below Target

            </option>

            <option value="NO ORDER">

              No Order

            </option>

          </select>


        </div>


      </div>


      <!-- DESKTOP TABLE -->

      <div class=
        "desktop-customer-table">

        <div class=
          "table-wrap">

          <table>

            <thead>

              <tr>

                <th>#</th>

                <th>
                  Customer Name /
                  BeatRoute Name
                </th>

                <th>Freq.</th>

                <th>
                  Order Activity
                </th>

                <th>
                  Volume
                </th>

                <th>
                  Last Order
                </th>

                <th>Status</th>

              </tr>

            </thead>

            <tbody
              id="customerRowsDesktop">

              ${desktopCustomerRows(
                data.customers
              )}

            </tbody>

          </table>

        </div>

      </div>


      <!-- MOBILE CUSTOMER CARDS -->

      <div
        id="customerRowsMobile"
        class=
        "mobile-customer-list">

        ${mobileCustomerRows(
          data.customers
        )}

      </div>


    </div>


    <div class=
      "section-title">

      <strong>

        Exceptions —
        DSP ${data.dsp}

      </strong>

      <span>

        Items needing review

      </span>

    </div>


    <div class=
      "exception-grid">


      ${exceptionCard(
        'Jumped Customers',

        'Customer belongs to another DSP’s SCL but was sold by DSP ' +
        data.dsp +
        '.',

        data.jumpedCustomers,

        'purple',

        'jumped',

        false
      )}


      ${exceptionCard(
        'New / Unassigned Customers',

        'Has sales but is not found in any SCL. Review for next month’s SCL.',

        data.newCustomers,

        'orange',

        'new',

        false
      )}


      ${exceptionCard(
        'Not Registered in BeatRoute',

        'Known customer requiring BeatRoute registration or mapping review.',

        data.notRegistered,

        'red',

        'notRegistered',

        false
      )}


      ${exceptionCard(
        'Temporary Sales Mapping',

        'Sales are temporarily encoded under another customer name.',

        data.temporaryMappings,

        'blue',

        'temporary',

        false
      )}


    </div>

  `;
}


/* =========================================================
DESKTOP CUSTOMER ROWS
========================================================= */

function desktopCustomerRows(
  rows
) {

  if (!rows.length) {

    return `

      <tr>

        <td colspan="7">

          <div class="empty">

            No customers found.

          </div>

        </td>

      </tr>

    `;
  }


  return rows
    .map(c => `


      <tr
        class="clickable"
        onclick=
        "openCustomerByNo('${escAttr(c.no)}')">


        <td>

          ${c.no || ''}

        </td>


        <td>


          <div class=
            "primary-name">

            ${esc(
              c.customerName
            )}

          </div>


          ${
            c.notRegistered

              ? `

                <div class=
                  "not-registered">

                  Not Registered

                </div>

              `

              : `

                <div class=
                  "secondary-name">

                  / ${esc(
                    c.beatrouteName ||
                    '-'
                  )}

                </div>

              `
          }


          ${
            c.temporarySalesNames &&
            c.temporarySalesNames.length

              ? `

                <div class=
                  "temp-text">

                  Temporary sales:
                  ${esc(
                    c.temporarySalesNames
                      .join(', ')
                  )}

                </div>

              `

              : ''
          }


        </td>


        <td>

          ${esc(
            c.frequency
          )}

        </td>


        <td>

          <div class=
            "number">

            ${c.orderDays}
            days

          </div>

          <div class=
            "muted">

            Target
            ${c.targetDays}

          </div>

        </td>


        <td class=
          "number">

          ${kg(
            c.actualKg
          )}

        </td>


        <td>

          ${c.lastOrder}

        </td>


        <td>

          ${statusBadge(
            c.status
          )}

        </td>


      </tr>


    `)
    .join('');
}


/* =========================================================
MOBILE CUSTOMER CARDS
========================================================= */

function mobileCustomerRows(
  rows
) {

  if (!rows.length) {

    return `

      <div class="empty">

        No customers found.

      </div>

    `;
  }


  return rows
    .map(c => `


      <div
        class=
        "mobile-customer-card"

        onclick=
        "openCustomerByNo('${escAttr(c.no)}')">


        <div class=
          "mobile-customer-top">


          <div>


            <div class=
              "mobile-customer-name">

              ${esc(
                c.customerName
              )}

            </div>


            ${
              c.notRegistered

                ? `

                  <div class=
                    "mobile-customer-issue">

                    Not Registered

                  </div>

                `

                : `

                  <div class=
                    "mobile-customer-br">

                    / ${esc(
                      c.beatrouteName ||
                      '-'
                    )}

                  </div>

                `
            }


            ${
              c.temporarySalesNames &&
              c.temporarySalesNames.length

                ? `

                  <div class=
                    "mobile-temp-map">

                    Temp sales:
                    ${esc(
                      c.temporarySalesNames
                        .join(', ')
                    )}

                  </div>

                `

                : ''
            }


          </div>


          <div>

            ${statusBadge(
              c.status
            )}

          </div>


        </div>


        <div class=
          "mobile-customer-grid">


          <div>

            <div class=
              "mobile-metric-label">

              Frequency

            </div>

            <div class=
              "mobile-metric-value">

              ${esc(
                c.frequency
              )}

            </div>

          </div>


          <div>

            <div class=
              "mobile-metric-label">

              Order Days

            </div>

            <div class=
              "mobile-metric-value">

              ${c.orderDays}
              / ${c.targetDays}

            </div>

          </div>


          <div>

            <div class=
              "mobile-metric-label">

              Volume

            </div>

            <div class=
              "mobile-metric-value">

              ${kg(
                c.actualKg
              )}

            </div>

          </div>


          <div>

            <div class=
              "mobile-metric-label">

              ADS

            </div>

            <div class=
              "mobile-metric-value">

              ${kg(
                c.adsKg
              )}

            </div>

          </div>


        </div>


        <div class=
          "mobile-customer-footer">


          <div class=
            "mobile-last-order">

            Last order:
            <strong>
              ${c.lastOrder}
            </strong>

          </div>


          <div style="
            color:#087a43;
            font-size:9px;
            font-weight:900;">

            View details ›

          </div>


        </div>


      </div>


    `)
    .join('');
}


/* =========================================================
FILTER
========================================================= */

function filterCustomers() {

  if (!CURRENT_DATA) {

    return;
  }


  const searchInput =
    document.getElementById(
      'customerSearch'
    );


  const statusInput =
    document.getElementById(
      'statusFilter'
    );


  if (
    !searchInput ||
    !statusInput
  ) {

    return;
  }


  const search =
    searchInput
      .value
      .trim()
      .toUpperCase();


  const status =
    statusInput.value;


  const filtered =
    CURRENT_DATA
      .customers
      .filter(c => {


        const haystack =
          (
            c.customerName +
            ' ' +
            c.beatrouteName +
            ' ' +
            c.address +
            ' ' +
            c.outletType +
            ' ' +
            (
              c.temporarySalesNames ||
              []
            ).join(' ')
          )
          .toUpperCase();


        const textOK =
          !search ||
          haystack.includes(
            search
          );


        const statusOK =
          status === 'ALL' ||
          c.status === status;


        return (
          textOK &&
          statusOK
        );
      });


  const desktop =
    document.getElementById(
      'customerRowsDesktop'
    );


  const mobile =
    document.getElementById(
      'customerRowsMobile'
    );


  if (desktop) {

    desktop.innerHTML =
      desktopCustomerRows(
        filtered
      );
  }


  if (mobile) {

    mobile.innerHTML =
      mobileCustomerRows(
        filtered
      );
  }
}


/* =========================================================
EXCEPTION CARDS
========================================================= */

function exceptionCard(
  title,
  subtitle,
  rows,
  color,
  type,
  globalView
) {

  return `


    <div class=
      "exception-card ${color}">


      <div class=
        "exception-head">


        <div>

          <strong>

            ${title}

          </strong>

          <small>

            ${subtitle}

          </small>

        </div>


        <span class=
          "badge ${color}">

          ${rows.length}

        </span>


      </div>


      <div class=
        "table-wrap">


        <table>


          <thead>

            <tr>


              <th>
                Customer
              </th>


              ${
                type ===
                'temporary'

                  ? `

                    <th>

                      Temporary Sales Name

                    </th>

                  `

                  : ''
              }


              ${
                type ===
                'jumped'

                  ? `

                    <th>
                      Assigned DSP
                    </th>

                  `

                  : ''
              }


              ${
                globalView

                  ? `

                    <th>
                      Selling DSP
                    </th>

                  `

                  : ''
              }


              <th>Days</th>

              <th>KG</th>

              <th>
                Last Order
              </th>


            </tr>

          </thead>


          <tbody>


            ${
              rows.length

                ? rows
                  .slice(
                    0,
                    globalView
                      ? 9999
                      : 8
                  )
                  .map(r => `


                    <tr>


                      <td>


                        <div class=
                          "primary-name">

                          ${esc(
                            r.customerName ||
                            r.beatrouteName ||
                            '-'
                          )}

                        </div>


                        ${
                          type ===
                          'notRegistered'

                            ? `

                              <div class=
                                "not-registered">

                                Not Registered

                              </div>

                            `

                            : r.beatrouteName

                              ? `

                                <div class=
                                  "secondary-name">

                                  / ${esc(
                                    r.beatrouteName
                                  )}

                                </div>

                              `

                              : ''
                        }


                        ${
                          type ===
                          'new'

                            ? `

                              <div class=
                                "next-scl">

                                Review for Next SCL

                              </div>

                            `

                            : ''
                        }


                      </td>


                      ${
                        type ===
                        'temporary'

                          ? `

                            <td>

                              <span class=
                                "badge blue">

                                ${esc(
                                  r.tempSalesName ||
                                  '-'
                                )}

                              </span>

                            </td>

                          `

                          : ''
                      }


                      ${
                        type ===
                        'jumped'

                          ? `

                            <td>

                              <span class=
                                "badge purple">

                                DSP
                                ${r.assignedDSP}

                              </span>

                            </td>

                          `

                          : ''
                      }


                      ${
                        globalView

                          ? `

                            <td>

                              ${
                                r.sellingDSP

                                  ? `

                                    <span class=
                                      "badge green">

                                      DSP
                                      ${r.sellingDSP}

                                    </span>

                                  `

                                  : `

                                    <span class=
                                      "muted">

                                      No sale

                                    </span>

                                  `
                              }

                            </td>

                          `

                          : ''
                      }


                      <td>

                        ${r.orderDays}

                      </td>


                      <td class=
                        "number">

                        ${kg(
                          r.actualKg
                        )}

                      </td>


                      <td>

                        ${r.lastOrder}

                      </td>


                    </tr>


                  `)
                  .join('')

                : `

                  <tr>

                    <td colspan="7">

                      <div class="empty">

                        <strong>
                          No exceptions
                        </strong>

                        Nothing to review.

                      </div>

                    </td>

                  </tr>

                `
            }


          </tbody>


        </table>


      </div>


    </div>

  `;
}


/* =========================================================
CUSTOMER DETAILS
========================================================= */

function openCustomerByNo(
  no
) {

  if (!CURRENT_DATA) {

    return;
  }


  const c =
    CURRENT_DATA
      .customers
      .find(
        x =>
          String(x.no) ===
          String(no)
      );


  if (!c) {

    return;
  }


  document.getElementById(
    'modalName'
  ).textContent =
    c.customerName;


  let info =
    c.address;


  if (
    c.notRegistered
  ) {

    info =
      'Not Registered • ' +
      info;
  }

  else if (
    c.beatrouteName
  ) {

    info =
      c.beatrouteName +
      ' • ' +
      info;
  }


  document.getElementById(
    'modalInfo'
  ).textContent =
    info;


  const temporaryInfo =
    c.temporarySalesNames &&
    c.temporarySalesNames.length

      ? `

        <div style="
          margin-top:15px;
          padding:11px 12px;
          border:1px solid #d6e8fb;
          background:#f3f8ff;
          border-radius:10px;">

          <div style="
            font-size:8px;
            color:#2878c8;
            font-weight:900;
            text-transform:uppercase;">

            Temporary Sales Mapping

          </div>


          <div style="
            margin-top:5px;
            font-size:11px;
            font-weight:800;">

            ${esc(
              c.temporarySalesNames
                .join(', ')
            )}

          </div>


        </div>

      `

      : '';


  const orders =
    c.dailyOrders.length

      ? c.dailyOrders
        .map(o => `


          <div class=
            "order-row">


            <span>

              ${o.date}

            </span>


            <strong>

              ${kg(
                o.kg
              )}

            </strong>


          </div>


        `)
        .join('')

      : `

        <div class="empty">

          No orders during
          this period.

        </div>

      `;


  document.getElementById(
    'modalBody'
  ).innerHTML = `


    <div style=
      "margin-top:14px">

      ${statusBadge(
        c.status
      )}

    </div>


    ${temporaryInfo}


    <div class=
      "detail-grid">


      ${detailCard(
        'Frequency',
        c.frequency
      )}


      ${detailCard(
        'Target Days',
        c.targetDays
      )}


      ${detailCard(
        'Order Days',
        c.orderDays
      )}


      ${detailCard(
        'Actual KG',
        kg(
          c.actualKg
        )
      )}


      ${detailCard(
        'ADS',
        kg(
          c.adsKg
        )
      )}


      ${detailCard(
        'Last Order',
        c.lastOrder
      )}


    </div>


    <div style="
      margin:20px 0 9px;
      font-size:12px;
      font-weight:900;">

      Order History

    </div>


    <div class=
      "order-list">

      ${orders}

    </div>

  `;


  document
    .getElementById(
      'modal'
    )
    .classList
    .add(
      'show'
    );
}


function detailCard(
  label,
  value
) {

  return `

    <div class=
      "detail-card">

      <span>

        ${label}

      </span>

      <strong>

        ${value}

      </strong>

    </div>

  `;
}


function closeModal() {

  document
    .getElementById(
      'modal'
    )
    .classList
    .remove(
      'show'
    );
}


function modalBg(e) {

  if (
    e.target.id ===
    'modal'
  ) {

    closeModal();
  }
}


/* =========================================================
OVERVIEW
========================================================= */

function loadOverview() {

  loading(true);


  apiCall('overview', { month: CURRENT_MONTH })
    .then(rows => {


        renderOverview(
          rows
        );


        loading(false);
      })
    .catch(showError);
}


function renderOverview(
  rows
) {

  const totalScl =
    rows.reduce(
      (s,r) =>
        s +
        r.sclCustomers,
      0
    );


  const served =
    rows.reduce(
      (s,r) =>
        s +
        r.served,
      0
    );


  const volume =
    rows.reduce(
      (s,r) =>
        s +
        r.actualKg,
      0
    );


  const exceptions =
    rows.reduce(
      (s,r) =>
        s +
        r.exceptions,
      0
    );


  document.getElementById(
    'content'
  ).innerHTML = `


    <div class=
      "page-head">


      <div>

        <h1>

          Overview

        </h1>

        <p>

          ${monthLabel(
            CURRENT_MONTH
          )}

          • All DSPs

        </p>

      </div>


    </div>


    <div class=
      "hero-grid">


      ${heroCard(
        'SCL Customers',
        totalScl,
        'All assigned customers'
      )}


      ${heroCard(
        'Served Customers',
        served,
        'Customers with orders'
      )}


      ${heroCard(
        'Sales Volume',
        kg(volume),
        'Combined DSP sales'
      )}


      ${heroCard(
        'Review Items',
        exceptions,
        'All exception types'
      )}


    </div>


    <div class="panel">


      <div class=
        "panel-head">

        <div>

          <div class=
            "panel-title">

            DSP Performance

          </div>

          <div class=
            "panel-sub">

            Sales, service and
            exception overview

          </div>

        </div>

      </div>


      <div class=
        "table-wrap">


        <table style="
          min-width:900px;">


          <thead>

            <tr>

              <th>DSP</th>

              <th>SCL</th>

              <th>Served</th>

              <th>
                Not Served
              </th>

              <th>
                Service %
              </th>

              <th>
                On Target
              </th>

              <th>Below</th>

              <th>
                Sales KG
              </th>

              <th>Jumped</th>

              <th>New</th>

              <th>
                Not Registered
              </th>

              <th>
                Temp Mapping
              </th>

            </tr>

          </thead>


          <tbody>


            ${rows
              .map(r => `


                <tr>


                  <td>

                    <strong>

                      DSP ${r.dsp}

                    </strong>

                  </td>


                  <td>

                    ${r.sclCustomers}

                  </td>


                  <td>

                    ${r.served}

                  </td>


                  <td>

                    ${r.notServed}

                  </td>


                  <td>

                    ${r.serviceRate}%

                  </td>


                  <td>

                    ${r.onTarget}

                  </td>


                  <td>

                    ${r.belowTarget}

                  </td>


                  <td class=
                    "number">

                    ${kg(
                      r.actualKg
                    )}

                  </td>


                  <td>

                    ${r.jumped}

                  </td>


                  <td>

                    ${r.newCustomers}

                  </td>


                  <td>

                    ${r.notRegistered}

                  </td>


                  <td>

                    ${r.temporaryMappings}

                  </td>


                </tr>


              `)
              .join('')}


          </tbody>


        </table>


      </div>


    </div>

  `;
}


/* =========================================================
ALL EXCEPTIONS
========================================================= */

function loadAllExceptions() {

  loading(true);


  apiCall('exceptions', { month: CURRENT_MONTH })
    .then(data => {


        renderAllExceptions(
          data
        );


        loading(false);
      })
    .catch(showError);
}


function renderAllExceptions(
  data
) {

  const total =
    data.jumpedCustomers.length +
    data.newCustomers.length +
    data.notRegistered.length +
    data.temporaryMappings.length;


  document.getElementById(
    'content'
  ).innerHTML = `


    <div class=
      "page-head">


      <div>

        <h1>

          Exceptions

        </h1>

        <p>

          ${data.monthLabel}

          • All DSPs

        </p>

      </div>


      <div class=
        "period-pill">

        ${total}
        items for review

      </div>


    </div>


    <div class=
      "status-strip">


      ${statusBox(
        'Jumped',
        data.jumpedCustomers.length,
        'purple'
      )}


      ${statusBox(
        'New / Unassigned',
        data.newCustomers.length,
        'orange'
      )}


      ${statusBox(
        'Not Registered',
        data.notRegistered.length,
        'red'
      )}


      ${statusBox(
        'Temp Mapping',
        data.temporaryMappings.length,
        'blue'
      )}


    </div>


    <div style="
      display:grid;
      gap:14px;">


      ${exceptionCard(
        'Jumped Customers',

        'Customer is assigned to one DSP but was sold by another DSP.',

        data.jumpedCustomers,

        'purple',

        'jumped',

        true
      )}


      ${exceptionCard(
        'New / Unassigned Customers',

        'Has sales but no current SCL assignment. Review for next month’s SCL.',

        data.newCustomers,

        'orange',

        'new',

        true
      )}


      ${exceptionCard(
        'Not Registered in BeatRoute',

        'Customer requires BeatRoute registration or mapping review.',

        data.notRegistered,

        'red',

        'notRegistered',

        true
      )}


      ${exceptionCard(
        'Temporary Sales Mapping',

        'Known customer whose sales are temporarily encoded under another name.',

        data.temporaryMappings,

        'blue',

        'temporary',

        true
      )}


    </div>

  `;
}


/* =========================================================
UI COMPONENTS
========================================================= */

function heroCard(
  label,
  value,
  sub,
  cls=''
) {

  return `

    <div class=
      "hero-card ${cls}">

      <div class=
        "hero-label">

        ${label}

      </div>

      <div class=
        "hero-value">

        ${value}

      </div>

      <div class=
        "hero-sub">

        ${sub}

      </div>

    </div>

  `;
}


function statusBox(
  label,
  value,
  color
) {

  return `

    <div class=
      "status-box ${color}">

      <span>

        ${label}

      </span>

      <strong>

        ${value}

      </strong>

    </div>

  `;
}


function statusBadge(
  status
) {

  if (
    status ===
    'ON TARGET'
  ) {

    return `

      <span class=
        "badge green">

        ON TARGET

      </span>

    `;
  }


  if (
    status ===
    'BELOW TARGET'
  ) {

    return `

      <span class=
        "badge yellow">

        BELOW TARGET

      </span>

    `;
  }


  return `

    <span class=
      "badge red">

      NO ORDER

    </span>

  `;
}


/* =========================================================
FORMATTING
========================================================= */

function kg(
  value
) {

  return Number(
    value || 0
  )
  .toLocaleString(
    'en-PH',
    {
      minimumFractionDigits:2,
      maximumFractionDigits:2
    }
  ) +
  ' KG';
}


function monthLabel(
  key
) {

  const [y,m] =
    key
      .split('-')
      .map(Number);


  return new Date(
    y,
    m - 1,
    1
  )
  .toLocaleDateString(
    'en-US',
    {
      month:'long',
      year:'numeric'
    }
  );
}


/* =========================================================
SAFE HTML
========================================================= */

function esc(
  value
) {

  return String(
    value == null
      ? ''
      : value
  )
  .replace(/&/g,'&amp;')
  .replace(/</g,'&lt;')
  .replace(/>/g,'&gt;')
  .replace(/"/g,'&quot;')
  .replace(/'/g,'&#039;');
}


function escAttr(
  value
) {

  return esc(
    value
  );
}


/* =========================================================
LOADING / ERROR
========================================================= */

function loading(
  show
) {

  document
    .getElementById(
      'loading'
    )
    .classList
    .toggle(
      'show',
      show
    );
}


function showError(
  err
) {

  loading(false);


  document.getElementById(
    'content'
  ).innerHTML = `

    <div class="panel">

      <div class="empty">

        <strong>

          Something went wrong

        </strong>

        ${esc(
          err.message ||
          String(err)
        )}

      </div>

    </div>

  `;
}
