/* UX fase 1 (item 1): bibliotecas pesadas (jsPDF ~420 KB, Chart.js ~208 KB) só são baixadas quando usadas.
   Mesmos arquivos locais de vendor/ (mesma origem, CSP inalterada). Promessa cacheada: cada script carrega no máximo 1 vez. */
(function (root) {
  'use strict';
  var cache = {};
  function load(src) {
    if (cache[src]) return cache[src];
    cache[src] = new Promise(function (resolve, reject) {
      var s = document.createElement('script'); s.src = src; s.async = false;
      s.onload = function () { resolve(); }; s.onerror = function () { delete cache[src]; reject(new Error('Falha ao carregar ' + src)); };
      document.head.appendChild(s);
    });
    return cache[src];
  }
  var PDF = ['vendor/jspdf-4.2.1/jspdf.umd.min.js', 'vendor/jspdf-autotable-5.0.8/jspdf.plugin.autotable.min.js'];
  var CHART = 'vendor/chart.js-4.5.1/chart.umd.js';
  root.KacVendor = {
    pdf: function () { if (root.jspdf && root.jspdf.jsPDF && root.jspdf.jsPDF.API && root.jspdf.jsPDF.API.autoTable) return Promise.resolve(); return load(PDF[0]).then(function () { return load(PDF[1]); }); },
    chart: function () { return root.Chart ? Promise.resolve() : load(CHART); },
    _load: load
  };
})(window);
