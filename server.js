const express = require('express');
const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

// Database mockato per la demo
const db = {
  members: [
    { id: 1, tax_code: 'RSSMRA85A01H501Z', first_name: 'Mario', last_name: 'Rossi', role: 'Calciatore' },
    { id: 2, tax_code: 'VRDGRP90B02F205Y', first_name: 'Giuseppe', last_name: 'Verdi', role: 'Calciatore' },
    { id: 3, tax_code: 'BNCLCU95C03L219X', first_name: 'Luca', last_name: 'Bianchi', role: 'Calciatore' },
    { id: 4, tax_code: 'NRDNDR98D04I119W', first_name: 'Andrea', last_name: 'Neri', role: 'Calciatore' },
    { id: 5, tax_code: 'PDRDVD80E05M100V', first_name: 'Davide', last_name: 'Pedone', role: 'Allenatore' }
  ],
  sanctions: [
    { id: 101, member_id: 2, sanction_type: 'SQUALIFICA_GIORNATE', matches_ban_remaining: 1, notes: 'Squalifica 1 gg ex CU n. 42' },
    { id: 102, member_id: 3, sanction_type: 'DIFFIDA', matches_ban_remaining: 0, notes: '4ª ammonizione - In Diffida' }
  ]
};

app.post('/api/v1/validate-lineup', (req, res) => {
  const { players_list } = req.body;
  if (!players_list || !Array.isArray(players_list)) {
    return res.status(400).json({ error: 'Seleziona almeno un tesserato' });
  }

  let hasBlockingError = false;
  const results = players_list.map((playerId) => {
    const member = db.members.find((m) => m.id === playerId);
    const memberSanctions = db.sanctions.filter((s) => s.member_id === playerId);

    let status = 'GREEN';
    let message = 'Tesserato schierabile regolarmente';

    for (let s of memberSanctions) {
      if (s.sanction_type === 'SQUALIFICA_GIORNATE' && s.matches_ban_remaining > 0) {
        status = 'RED';
        message = `SQUALIFICATO (${s.notes})`;
        hasBlockingError = true;
        break;
      }
      if (s.sanction_type === 'DIFFIDA') {
        status = 'YELLOW';
        message = `DIFFIDATO (${s.notes})`;
      }
    }

    return {
      playerId,
      fullName: member ? `${member.last_name} ${member.first_name}` : 'Sconosciuto',
      role: member ? member.role : '',
      status,
      message
    };
  });

  res.json({
    isValid: !hasBlockingError,
    summary: hasBlockingError ? 'ATTENZIONE: SCONFITTA A TAVOLINO!' : 'DISTINTA VALIDA',
    details: results
  });
});

app.get('/', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html lang="it">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>WE ARE CALCIO</title>
      <style>
        body { font-family: sans-serif; background: #f4f6f9; padding: 20px; }
        .card { max-width: 500px; margin: 0 auto; background: white; padding: 20px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
        .item { padding: 10px 0; border-bottom: 1px solid #eee; display: flex; align-items: center; }
        .btn { width: 100%; background: #28a745; color: white; border: none; padding: 12px; font-size: 16px; border-radius: 6px; cursor: pointer; margin-top: 15px; font-weight: bold; }
        .result { margin-top: 20px; padding: 15px; border-radius: 6px; }
        .RED { background: #f8d7da; color: #721c24; }
        .GREEN { background: #d4edda; color: #155724; }
      </style>
    </head>
    <body>
      <div class="card">
        <h2>⚽ WE ARE CALCIO</h2>
        <p>Seleziona la formazione:</p>
        <form id="f">
          ${db.members.map(m => `
            <div class="item">
              <input type="checkbox" value="${m.id}" name="p" id="p${m.id}">
              <label for="p${m.id}" style="margin-left:10px;"><strong>${m.last_name} ${m.first_name}</strong> (${m.role})</label>
            </div>
          `).join('')}
          <button type="button" class="btn" onclick="check()">VERIFICA DISTINTA</button>
        </form>
        <div id="res"></div>
      </div>
      <script>
        async function check() {
          const ids = Array.from(document.querySelectorAll('input[name="p"]:checked')).map(c => parseInt(c.value));
          if(!ids.length) return alert('Seleziona almeno un tesserato');
          const r = await fetch('/api/v1/validate-lineup', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({ players_list: ids })
          });
          const d = await r.json();
          let h = '<div class="result ' + (d.isValid ? 'GREEN' : 'RED') + '"><h3>' + d.summary + '</h3><ul>';
          d.details.forEach(i => { h += '<li><strong>' + i.fullName + '</strong>: [' + i.status + '] ' + i.message + '</li>'; });
          h += '</ul></div>';
          document.getElementById('res').innerHTML = h;
        }
      </script>
    </body>
    </html>
  `);
});

app.listen(PORT, () => console.log('App avviata'));
