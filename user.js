// USER.JS — Atlantas Platform (Coming Soon Mode)
'use strict';

if (!firebase.apps || !firebase.apps.length) firebase.initializeApp(FIREBASE_CONFIG);
var auth = firebase.auth();
var db   = firebase.database();

var _cfg  = {};
var _user = null;

function $(id){ return document.getElementById(id); }

function showScreen(name){
  ['auth-screen','coming-soon'].forEach(function(id){
    var e=$(id); if(e) e.classList.remove('visible');
  });
  var e=$(name); if(e) e.classList.add('visible');
}

// Load config from Firebase
function loadConfig(cb){
  db.ref(DB.appConfig).once('value', function(snap){
    _cfg = snap.val() || {};
    applyBranding();
    if(cb) cb();
  });
}

// Also watch for live changes (so "Turn On" in dev portal reflects immediately)
function watchConfig(){
  db.ref(DB.appConfig).on('value', function(snap){
    _cfg = snap.val() || {};
    applyBranding();
    // If system is now ON and user is logged in — reload to get full app
    if(_cfg.systemEnabled && _user){
      window.location.reload();
    }
  });
}

function applyBranding(){
  var name = _cfg.appName || 'Atlantas';
  var sub  = _cfg.appSubtitle || 'Secure · Reliable · Global';
  document.title = name;
  var el;
  el=$('auth-app-name'); if(el) el.textContent = name;
  el=$('auth-app-sub');  if(el) el.textContent = sub;
  el=$('cs-title');      if(el) el.textContent = _cfg.comingSoonTitle   || 'Coming Soon';
  el=$('cs-sub');        if(el) el.textContent = _cfg.comingSoonMessage || "We're putting the finishing touches on something amazing. Check back soon!";
  var logo = _cfg.appLogoUrl || 'https://i.imgur.com/iN8T10D.jpeg';
  el=$('auth-logo-img'); if(el) el.src = logo;
  // Apply primary color if set
  if(_cfg.primaryColor) document.documentElement.style.setProperty('--p', _cfg.primaryColor);
  if(_cfg.bgColor)      document.documentElement.style.setProperty('--bg', _cfg.bgColor);
  if(_cfg.textColor)    document.documentElement.style.setProperty('--text', _cfg.textColor);
}

// Account number generator
function genAccNum(){
  return new Promise(function(res){
    (function try1(){
      var n = String(Math.floor(1000000000 + Math.random() * 9000000000));
      db.ref(DB.accountNums+'/'+n).once('value').then(function(s){
        if(s.exists()) try1(); else res(n);
      });
    })();
  });
}

function fbErr(code){
  return ({
    'auth/user-not-found':'No account found with this email.',
    'auth/wrong-password':'Incorrect password.',
    'auth/email-already-in-use':'Email already registered.',
    'auth/invalid-email':'Invalid email address.',
    'auth/weak-password':'Password too weak (min 6 chars).',
    'auth/too-many-requests':'Too many attempts. Try again later.'
  }[code]) || 'Something went wrong. Please try again.';
}

// ── AUTH STATE ────────────────────────────────────────────────
auth.onAuthStateChanged(function(user){
  _user = user;
  if(!user){
    showScreen('auth-screen');
    var lb=$('login-btn'); if(lb){lb.textContent='Log In';lb.disabled=false;}
    return;
  }
  // User is logged in — check if system is enabled
  db.ref(DB.appConfig+'/systemEnabled').once('value', function(snap){
    if(snap.val() === true){
      // System ON — reload to load full app (placeholder for future full user.js)
      // For now still show coming soon but with a different message
      showComingSoon(user);
    } else {
      showComingSoon(user);
    }
  });
});

function showComingSoon(user){
  showScreen('coming-soon');
  db.ref(DB.users+'/'+user.uid+'/firstname').once('value', function(snap){
    var name = snap.val() || user.email;
    var el = $('cs-username');
    if(el) el.textContent = 'Logged in as ' + name;
  });
}

// ── BOOT ─────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', function(){
  // Referral code from URL
  var urlParams = new URLSearchParams(window.location.search);
  var refFromUrl = urlParams.get('ref');
  if(refFromUrl){
    var cleanRef = refFromUrl.trim().toUpperCase();
    sessionStorage.setItem('atl_ref', cleanRef);
    var ra=$('su-ref-applied'), rd=$('su-ref-display'), rm=$('su-ref-manual');
    if(ra) ra.style.display = '';
    if(rd) rd.textContent = cleanRef;
    if(rm) rm.style.display = 'none';
    setTimeout(function(){
      var ls=$('login-section'), ss=$('signup-section');
      if(ls) ls.style.display='none';
      if(ss) ss.style.display='';
    }, 300);
  }

  loadConfig(function(){
    auth.onAuthStateChanged(function(user){
      _user = user;
      if(!user){
        showScreen('auth-screen');
        var lb=$('login-btn'); if(lb){lb.textContent='Log In';lb.disabled=false;}
        return;
      }
      showComingSoon(user);
    });
    watchConfig();
  });

  // Login
  $('login-btn').addEventListener('click', doLogin);
  $('li-email').addEventListener('keydown',    function(e){ if(e.key==='Enter') doLogin(); });
  $('li-password').addEventListener('keydown', function(e){ if(e.key==='Enter') doLogin(); });

  // Signup
  $('signup-btn').addEventListener('click', doSignup);
  $('to-signup').addEventListener('click', function(){
    $('login-section').style.display='none';
    $('signup-section').style.display='';
  });
  $('to-login').addEventListener('click', function(){
    $('login-section').style.display='';
    $('signup-section').style.display='none';
  });

  // Coming soon logout
  $('cs-logout-btn').addEventListener('click', function(){
    auth.signOut();
  });
});

function doLogin(){
  var email    = ($('li-email').value||'').trim();
  var pass     = $('li-password').value;
  var err      = $('login-error');
  err.textContent = '';
  if(!email||!pass){ err.textContent='Please enter email and password.'; return; }
  $('login-btn').textContent='Logging in…'; $('login-btn').disabled=true;
  auth.signInWithEmailAndPassword(email, pass).catch(function(e){
    err.textContent = fbErr(e.code);
    $('login-btn').textContent='Log In'; $('login-btn').disabled=false;
  });
}

function doSignup(){
  var sur  = ($('su-surname').value||'').trim();
  var fn   = ($('su-firstname').value||'').trim();
  var oth  = ($('su-othername').value||'').trim();
  var ph   = ($('su-phone').value||'').trim();
  var un   = ($('su-username').value||'').trim().toLowerCase();
  var em   = ($('su-email').value||'').trim().toLowerCase();
  var pw   = $('su-password').value;
  var cf   = $('su-confirm').value;
  var cur  = $('su-currency').value;
  var co   = $('su-country').value;
  var promo= ($('su-promo').value||'').trim().toUpperCase();
  var refInput = $('su-referral');
  var ref  = (sessionStorage.getItem('atl_ref')||(refInput&&refInput.value||'')).trim().toUpperCase();
  var err  = $('signup-error');
  err.textContent = '';

  if(!sur||!fn||!ph||!un||!em||!pw||!co){ err.textContent='Please fill in all required fields.'; return; }
  if(pw!==cf){ err.textContent='Passwords do not match.'; return; }
  if(pw.length<8){ err.textContent='Password must be at least 8 characters.'; return; }

  $('signup-btn').textContent='Creating…'; $('signup-btn').disabled=true;

  auth.createUserWithEmailAndPassword(em, pw).then(function(cred){
    var uid = cred.user.uid;
    return genAccNum().then(function(accNum){
      var promoCode    = (_cfg.promoCode||'').toUpperCase();
      var promoBalance = parseFloat(_cfg.promoBalance)||500000;
      var welcomeBonus = parseFloat(_cfg.welcomeBonus)||0;
      var refBonus     = parseFloat(_cfg.referralBonus)||10;
      var bal = (promoCode && promo === promoCode) ? promoBalance : welcomeBonus;
      var refCode = 'ATL-'+uid.slice(0,6).toUpperCase();

      return db.ref(DB.users+'/'+uid).set({
        surname:sur, firstname:fn, othername:oth, phone:ph,
        username:un, email:em, currency:cur, country:co,
        accountNumber:accNum, balance:bal+(ref?refBonus:0),
        history:[], linkedCards:[],
        referralCode:refCode, referrals:[], referralEarned:0,
        referralClaimed:false, referredBy:ref||'',
        createdDate:new Date().toISOString()
      })
      .then(function(){ return db.ref(DB.accountNums+'/'+accNum).set(uid); })
      .then(function(){ return db.ref(DB.publicDir+'/'+uid).set({firstname:fn, surname:sur, accountNumber:accNum}); })
      .then(function(){
        if(ref){
          db.ref(DB.users).orderByChild('referralCode').equalTo(ref).once('value', function(snap){
            snap.forEach(function(s){
              var u=s.val(); if(!u) return;
              var refs=(u.referrals||[]); refs.push({uid:uid, date:new Date().toISOString()});
              db.ref(DB.users+'/'+s.key).update({referrals:refs, referralEarned:(parseFloat(u.referralEarned)||0)+refBonus});
            });
          });
          sessionStorage.removeItem('atl_ref');
        }
      });
    });
  }).catch(function(e){
    $('signup-error').textContent = fbErr(e.code);
    $('signup-btn').textContent='Create Account'; $('signup-btn').disabled=false;
  });
}
