/* S1 持证上岗：4 种证书 × 4 套版式，实时预览 */
(function () {
  const U = APP.util, D = APP.DATA, $ = U.$;
  const body = () => $('#body-cert');
  let built = false;
  let timer = null;

  function certNo(c) {
    const dept = D.DEPTS.find((d) => d.code === c.dept) || D.DEPTS[0];
    const n = String(c.num || '0000').replace(/\D/g, '').padStart(4, '0').slice(-4);
    const seed = dept.code + n + c.certId;
    let s = 0;
    for (let i = 0; i < seed.length; i++) s += seed.charCodeAt(i) * (i + 3);
    return 'WB-1024-' + dept.code + '-' + n + '-' + String(s % 97).padStart(2, '0');
  }

  function current() {
    const c = APP.state.cert;
    const def = D.CERTS.find((x) => x.id === c.certId) || D.CERTS[0];
    const dept = D.DEPTS.find((d) => d.code === c.dept) || D.DEPTS[0];
    return {
      id: def.id, title: def.title, sub: def.sub, note: def.note, body: def.body,
      name: (c.name || '某某某').slice(0, 12), dept: dept.name, deptCode: dept.code,
      no: String(c.num || (APP.state.num != null ? U.pad(APP.state.num, 4) : '0000')).padStart(4, '0'),
      skin: c.skin || 'red',
      date: c.date || U.today(),
      certNo: certNo({ dept: dept.code, num: c.num, certId: def.id })
    };
  }

  function shell() {
    const c = APP.state.cert;
    const box = body();
    box.innerHTML = ''
      + '<div class="cert-wrap">'
      + '<div class="row row--tight">'
      + D.CERTS.map((x) => '<button class="pick' + (c.certId === x.id ? ' is-on' : '') + '" data-cert="' + x.id + '">' + U.esc(x.title) + '</button>').join('')
      + '</div>'
      + '<div class="cert-stage" id="certStage"></div>'
      + '<div class="only-open">'
      + '<div class="cert-fields">'
      + '<div class="field"><label>姓名</label><input class="input" id="fName" maxlength="12" value="' + U.esc(c.name) + '" placeholder="最多 12 字"></div>'
      + '<div class="field"><label>工号</label><input class="input" id="fNo" maxlength="4" value="' + U.esc(c.num || (APP.state.num != null ? U.pad(APP.state.num, 4) : '')) + '" placeholder="4 位数字"></div>'
      + '<div class="field"><label>部门</label><select class="select" id="fDept">'
      + D.DEPTS.map((d) => '<option value="' + d.code + '"' + (c.dept === d.code ? ' selected' : '') + '>' + U.esc(d.name) + '</option>').join('')
      + '</select></div>'
      + '<div class="field"><label>版式</label><select class="select" id="fSkin">'
      + D.CERT_SKINS.map((s) => '<option value="' + s.id + '"' + (c.skin === s.id ? ' selected' : '') + '>' + U.esc(s.name) + '</option>').join('')
      + '</select></div>'
      + '</div>'
      + '<div class="row">'
      + '<button class="btn btn--main" data-act="save">保存证书 PNG</button>'
      + '<button class="btn" data-act="reset">用我的工号</button>'
      + '<button class="btn btn--ghost" data-act="copy">复制持证文案</button>'
      + '</div>'
      + '<div class="note">本证书为娱乐性质，不具备任何法定效力。证书编号按部门 + 工号 + 证书类型生成，可作防伪校验。</div>'
      + '</div>'
      + '</div>';

    box.oninput = (e) => {
      if (e.target.id === 'fName') { APP.state.cert.name = e.target.value || '某某某'; }
      if (e.target.id === 'fNo') { APP.state.cert.num = e.target.value.replace(/\D/g, '').slice(0, 4); }
      U.save(); schedule();
    };
    box.onchange = (e) => {
      if (e.target.id === 'fDept') APP.state.cert.dept = e.target.value;
      if (e.target.id === 'fSkin') APP.state.cert.skin = e.target.value;
      U.save(); paint();
    };
    box.onclick = onClick;
    built = true;
  }

  function schedule() {
    clearTimeout(timer);
    timer = setTimeout(paint, 120);
  }

  function paint() {
    const stage = $('#certStage');
    if (!stage) return;
    const cv = APP.exporter.drawCert(current());
    stage.innerHTML = '';
    stage.appendChild(cv);
  }

  function onClick(e) {
    const pick = e.target.closest('[data-cert]');
    if (pick) {
      APP.state.cert.certId = pick.dataset.cert;
      U.save();
      APP.util.$$('.pick', body()).forEach((b) => b.classList.toggle('is-on', b.dataset.cert === pick.dataset.cert));
      paint();
      return;
    }
    const act = e.target.closest('[data-act]');
    if (!act) return;
    if (act.dataset.act === 'save') {
      const cv = APP.exporter.drawCert(current());
      const sp = current();
      APP.exporter.save(cv, '1024-cert-' + sp.id + '-' + sp.no + '.png');
    }
    if (act.dataset.act === 'reset') {
      if (APP.state.num == null) { U.toast('先去「我的程序员设」领个工号', 'warn'); return; }
      APP.state.cert.num = U.pad(APP.state.num, 4);
      const f = $('#fNo'); if (f) f.value = APP.state.cert.num;
      U.save(); paint();
    }
    if (act.dataset.act === 'copy') {
      const sp = current();
      const t = '兹证明 ' + sp.name + '（工号 ' + sp.no + ' · ' + sp.dept + '）'
        + '具备' + sp.title + '资格。证书编号 ' + sp.certNo + '。\n#WorkBuddy #1024程序员节';
      if (navigator.clipboard) navigator.clipboard.writeText(t).then(() => U.toast('已复制')).catch(() => U.toast('复制失败', 'warn'));
      else U.toast('请手动复制');
    }
  }

  APP.scenes.cert = {
    render() { if (!built) shell(); paint(); },
    refresh() { if (built) paint(); },
    onOpen() {
      if (!built) shell();
      if (!APP.state.cert.num && APP.state.num != null) {
        APP.state.cert.num = U.pad(APP.state.num, 4);
        const f = $('#fNo'); if (f) f.value = APP.state.cert.num;
      }
      paint();
    },
    onClose() {}
  };
})();
