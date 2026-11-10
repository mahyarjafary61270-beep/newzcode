import React, { useEffect, useRef, useState } from 'react';
import {
  ArrowLeft,
  ArrowUpRight,
  BellRing,
  Check,
  Flame,
  Globe,
  Headphones,
  HeartCrack,
  History,
  Languages,
  LogIn,
  Menu,
  MessageSquare,
  Mic,
  MicOff,
  MonitorUp,
  Music2,
  Radio,
  Reply,
  ShieldCheck,
  Smartphone,
  SmilePlus,
  Sparkles,
  Users,
  Volume2,
  Wifi,
  X,
  Zap
} from 'lucide-react';
import { Logo, Equalizer } from './bits.jsx';
import '../landing.css';

const NAV = [
  { href: '#features', label: 'قابلیت‌ها' },
  { href: '#voice', label: 'ویس و رادیو' },
  { href: '#updates', label: 'چه خبر؟' },
  { href: '#faq', label: 'سؤال‌ها' }
];

const STRIP = [
  { icon: MessageSquare, label: 'چت زنده' },
  { icon: Mic, label: 'ویس گروهی' },
  { icon: MonitorUp, label: 'اشتراک صفحه' },
  { icon: Radio, label: 'رادیو ۲۴ ساعته' },
  { icon: Languages, label: 'فارسی و راست‌چین' }
];

const CHAT_CARDS = [
  {
    icon: Reply,
    title: 'پاسخ، ری‌اکشن، ویرایش',
    text: 'روی هر پیام ریپلای بزن، با ایموجی واکنش بده یا پیامت را ویرایش کن؛ همه زنده و بدون رفرش.'
  },
  {
    icon: SmilePlus,
    title: 'واکنش‌های سریع',
    text: 'بیست ایموجی آماده با یک کلیک، و می‌بینی دقیقاً چه کسی چه واکنشی داده.'
  },
  {
    icon: History,
    title: 'تاریخچه و بج نخوانده',
    text: 'همه‌ی پیام‌ها می‌مانند؛ کانال‌های نخوانده با یک بج کوچک خودشان را نشان می‌دهند.'
  },
  {
    icon: Zap,
    title: 'تایپینگ و ارسال سریع',
    text: 'می‌بینی کی دارد تایپ می‌کند، با Enter می‌فرستی و لینک‌ها خودکار کلیک‌پذیر می‌شوند.'
  }
];

const STATIONS = [
  { icon: Music2, name: 'پاپ فارسی', color: '#f472b6', num: '۱' },
  { icon: Flame, name: 'شوطی', color: '#fb923c', num: '۲' },
  { icon: Globe, name: 'پاپ جهانی', color: '#38bdf8', num: '۳' },
  { icon: HeartCrack, name: 'غمگین', color: '#a78bfa', num: '۴' }
];

const DETAILS = [
  { icon: Volume2, title: 'ولوم جدا برای هر نفر', text: 'صدای هر نفر را جدا کم و زیاد کن — مثل دیسکورد.' },
  { icon: Wifi, title: 'بهینه برای اینترنت ضعیف', text: 'صدای ویس ۲۴ کیلوبیت، ارسال در سکوت قطع و پکت‌های گم‌شده ترمیم می‌شوند.' },
  { icon: Headphones, title: 'ورود بی‌صدا', text: 'وقتی حوصله‌ی حرف زدن نداری، بی‌صدا وارد شو و فقط گوش کن.' },
  { icon: MonitorUp, title: 'اشتراک صفحه', text: 'صفحه یا بازی را با کیفیت و صدا برای جمع به اشتراک بگذار.' },
  { icon: ShieldCheck, title: 'ضد اسپم', text: 'محدودیت ارسال پیام و کد دعوت، برای اینکه جمع آرام بماند.' },
  { icon: Languages, title: 'فارسی و راست‌چین', text: 'کل رابط فارسی است: فونت وزیرمتن، تاریخ شمسی و اعداد فارسی.' },
  { icon: Smartphone, title: 'بدون نصب', text: 'مرورگر را باز می‌کنی و تمام؛ می‌توانی به صفحه‌ی اصلی گوشی هم اضافه‌اش کنی.' },
  { icon: BellRing, title: 'نوتیف و صدا', text: 'پیام جدید یا ورود رفیق به ویس را با صدا و اعلان متوجه می‌شوی.' }
];

const VERSIONS = [
  {
    v: 'v1.3',
    tag: 'آخرین',
    title: 'سبک و کم‌مصرف',
    text: 'صدای ویس روی اینترنت ضعیف بهینه شد: ۲۴ کیلوبیت، قطع ارسال در سکوت و ترمیم پکت‌های گم‌شده.'
  },
  {
    v: 'v1.2',
    title: 'نوتیف، صدا و پینگ',
    text: 'اعلان مرورگر، صدای ورود به ویس، پینگ «بیاید تو ویس»، ریپلای و ری‌اکشن و ویرایش پیام.'
  },
  {
    v: 'v1.1',
    title: 'کنترل ولوم هر نفر',
    text: 'برای هر نفر یک اسلایدر جدا، بی‌صدا کردن تک‌به‌تک و درصد فارسی.'
  },
  {
    v: 'v1.0',
    title: 'شروع',
    text: 'چت گروهی، ویس، اشتراک صفحه و رادیوی ۲۴ ساعته — همه در یک سرویس.'
  }
];

const FAQS = [
  {
    q: 'استفاده از مهیار گپ پولی است؟',
    a: 'نه. برای جمع خودمان ساخته شده و اگر خودت راهش بیندازی، هزینه‌اش فقط سرور خودت است.'
  },
  {
    q: 'چطور عضو شوم؟',
    a: 'با نام کاربری و رمز ثبت‌نام می‌کنی. اگر کد دعوت فعال باشد، باید کد را از دوستت بگیری.'
  },
  {
    q: 'روی گوشی کار می‌کند؟',
    a: 'بله، در مرورگر گوشی کامل کار می‌کند و می‌توانی به صفحه‌ی اصلی اضافه‌اش کنی تا مثل یک اپ باز شود.'
  },
  {
    q: 'ویس چطور کار می‌کند؟',
    a: 'با LiveKit؛ چراغ صحبت، کیفیت اتصال و ولوم جدا برای هر نفر. می‌توانی بی‌صدا وارد شوی یا همه را بی‌صدا کنی.'
  },
  {
    q: 'رادیو از کجا پخش می‌شود؟',
    a: 'استریم مستقیم از سرور رادیو به مرورگر هر شنونده می‌رود؛ از سرور اپ مصرفی نمی‌کند. اگر ویس یک دقیقه خالی بماند، رادیو خودش قطع می‌شود.'
  },
  {
    q: 'چت خصوصی یا تماس تک‌به‌تک داریم؟',
    a: 'فعلاً نه؛ همه‌چیز گروهی و داخل کانال‌های متنی و ویس است.'
  }
];

export default function Landing({ onEnter }) {
  const scroller = useRef(null);
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  // نوار بالا موقع اسکرول شیشه‌ای می‌شود
  useEffect(() => {
    const el = scroller.current;
    if (!el) return undefined;
    const onScroll = () => setScrolled(el.scrollTop > 14);
    el.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
    return () => el.removeEventListener('scroll', onScroll);
  }, []);

  // ظاهر شدن نرم بخش‌ها با اسکرول
  useEffect(() => {
    const root = scroller.current;
    if (!root) return undefined;
    const items = [...root.querySelectorAll('.reveal')];
    if (!('IntersectionObserver' in window)) {
      items.forEach((el) => el.classList.add('in'));
      return undefined;
    }
    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            entry.target.classList.add('in');
            io.unobserve(entry.target);
          }
        }
      },
      { root, threshold: 0.1, rootMargin: '0px 0px -6% 0px' }
    );
    items.forEach((el) => io.observe(el));
    // شبکه‌ی اطمینان: هیچ محتوایی پنهان نماند
    const fallback = setTimeout(() => items.forEach((el) => el.classList.add('in')), 2500);
    return () => {
      clearTimeout(fallback);
      io.disconnect();
    };
  }, []);

  // Esc برای بستن منوی موبایل
  useEffect(() => {
    if (!menuOpen) return undefined;
    const onKey = (e) => e.key === 'Escape' && setMenuOpen(false);
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [menuOpen]);

  const top = (e) => {
    e.preventDefault();
    scroller.current?.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const enter = (e) => {
    e?.preventDefault?.();
    setMenuOpen(false);
    onEnter?.();
  };

  return (
    <div className="landing-screen" ref={scroller}>
      <div className="landing-aurora" aria-hidden="true">
        <span className="la la-1" />
        <span className="la la-2" />
        <span className="la la-3" />
      </div>

      <header className={`lnav ${scrolled ? 'scrolled' : ''}`}>
        <div className="lnav-inner">
          <a className="lbrand" href="#top" onClick={top} aria-label="مهیار گپ — بالای صفحه">
            <Logo size={30} />
            <span className="lbrand-text">
              <b>مهیار گپ</b>
              <em>gap for the friends</em>
            </span>
          </a>

          <nav className="lnav-links" aria-label="منوی اصلی">
            {NAV.map((item) => (
              <a key={item.href} href={item.href}>
                {item.label}
              </a>
            ))}
          </nav>

          <button className="lbtn lbtn-primary lnav-cta" onClick={enter}>
            <LogIn size={15} />
            ورود به گپ
          </button>

          <button
            className="lnav-burger"
            onClick={() => setMenuOpen((v) => !v)}
            aria-label={menuOpen ? 'بستن منو' : 'باز کردن منو'}
            aria-expanded={menuOpen}
          >
            {menuOpen ? <X size={18} /> : <Menu size={18} />}
          </button>
        </div>

        {menuOpen && (
          <div className="lnav-mobile">
            {NAV.map((item) => (
              <a key={item.href} href={item.href} onClick={() => setMenuOpen(false)}>
                {item.label}
              </a>
            ))}
            <button className="lbtn lbtn-primary" onClick={enter}>
              <LogIn size={15} />
              ورود به گپ
            </button>
          </div>
        )}
      </header>

      <main id="top">
        <section className="lhero">
          <div className="lhero-copy reveal">
            <span className="leyebrow">
              <Sparkles size={13} />
              مخصوص رفیق‌ها — بدون تبلیغ، بدون الگوریتم
            </span>
            <h1>
              جای رفیق‌ها،
              <br />
              <span className="grad">همین‌جاست.</span>
            </h1>
            <p>
              یک گپ ساده و سبک برای جمع خودمان: چت زنده، ویس گروهی، اشتراک صفحه و رادیوی ۲۴ ساعته — همه در یک
              صفحه و بدون نصب.
            </p>
            <div className="lhero-actions">
              <button className="lbtn lbtn-primary lbtn-lg" onClick={enter}>
                <LogIn size={17} />
                ورود به گپ
              </button>
              <a className="lbtn lbtn-ghost lbtn-lg" href="#features">
                ببین چه دارد
                <ArrowLeft size={16} />
              </a>
            </div>
            <p className="lhero-note">
              <Check size={13} />
              ثبت‌نام با کد دعوت — فقط خودی‌ها
            </p>
          </div>

          <div className="lhero-visual reveal">
            <AppMock />
          </div>
        </section>

        <div className="lstrip">
          {STRIP.map(({ icon: Icon, label }) => (
            <span key={label}>
              <Icon size={13} />
              {label}
            </span>
          ))}
        </div>

        <section className="lsec" id="features">
          <div className="lsec-head reveal">
            <span className="leyebrow2">گپ</span>
            <h2>چت که فقط چت نیست.</h2>
            <p>
              چیزهایی که یک گپ ساده را قابل‌تحمل می‌کند: پاسخ، واکنش، ویرایش و بج نخوانده — همه زنده، بدون رفرش.
            </p>
          </div>
          <div className="lcards">
            {CHAT_CARDS.map(({ icon: Icon, title, text }, i) => (
              <article className="lcard reveal" key={title} style={{ transitionDelay: `${i * 70}ms` }}>
                <span className="lcard-icon">
                  <Icon size={18} />
                </span>
                <h3>{title}</h3>
                <p>{text}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="lsec" id="voice">
          <div className="lsplit">
            <div className="reveal">
              <div className="lsec-head">
                <span className="leyebrow2">ویس</span>
                <h2>مثل نشستن در یک اتاق.</h2>
                <p>
                  وارد ویس شو و مثل یک جمع واقعی حرف بزن؛ میکروفون و صدای هر نفر دست خودت است.
                </p>
              </div>
              <ul className="lbullets">
                <li>
                  <Volume2 size={15} />
                  <span>
                    <b>ولوم جدا برای هر نفر</b> — یک نفر بلند حرف می‌زند؟ صدایش را پایین بیاور.
                  </span>
                </li>
                <li>
                  <Headphones size={15} />
                  <span>
                    <b>بی‌صدا کردن همه</b> — با یک کلیک همه‌ی صداها قطع می‌شوند.
                  </span>
                </li>
                <li>
                  <Users size={15} />
                  <span>
                    <b>می‌بینی چه کسی صحبت می‌کند</b> — چراغ صحبت و کیفیت اتصال هر نفر.
                  </span>
                </li>
                <li>
                  <MonitorUp size={15} />
                  <span>
                    <b>اشتراک صفحه با صدا</b> — برای فیلم، بازی یا کار.
                  </span>
                </li>
              </ul>
            </div>
            <div className="reveal">
              <VoiceBoard />
            </div>
          </div>
        </section>

        <section className="lsec" id="radio">
          <div className="lsec-head reveal">
            <span className="leyebrow2">رادیو</span>
            <h2>رادیو، همیشه روشن.</h2>
            <p>با یک کامند رادیو را داخل ویس پخش کن؛ هر کس ولوم خودش را دارد و رادیو از صدای افراد جدا است.</p>
          </div>
          <div className="stations">
            {STATIONS.map((st, i) => {
              const Icon = st.icon;
              return (
                <article className="st-card reveal" key={st.name} style={{ '--st': st.color, transitionDelay: `${i * 60}ms` }}>
                  <span className="st-emoji">
                    <Icon size={20} />
                  </span>
                  <div className="st-name">{st.name}</div>
                  <div className="st-meta">۲۴ ساعته</div>
                  <div className="st-play">
                    {i === 0 ? <Equalizer color={st.color} bars={5} height={16} /> : <Radio size={14} />}
                    <span className="st-num">{st.num}</span>
                  </div>
                </article>
              );
            })}
          </div>
          <div className="lradio-note reveal">
            <Check size={14} />
            <span>
              رادیو مستقیم از سرور رادیو به مرورگر هر شنونده می‌رود؛ از سرور اپ مصرفی نمی‌کند. با کامند
              <span className="lcmd">/mp 1</span>
              تا
              <span className="lcmd">/mp 4</span>
              یا دکمه‌ی رادیو داخل ویس انتخابش کن. اگر ویس یک دقیقه خالی بماند، خودش قطع می‌شود.
            </span>
          </div>
        </section>

        <section className="lsec" id="details">
          <div className="lsec-head reveal">
            <span className="leyebrow2">جزئیات</span>
            <h2>چیزهای کوچکی که فرق می‌گذارند.</h2>
            <p>همان جزئیاتی که یک گپ دونفره را از یک اپ شلوغ جدا می‌کند.</p>
          </div>
          <div className="lgrid">
            {DETAILS.map(({ icon: Icon, title, text }, i) => (
              <article className="lgrid-item reveal" key={title} style={{ transitionDelay: `${i * 45}ms` }}>
                <span className="lgrid-icon">
                  <Icon size={15} />
                </span>
                <div>
                  <h3>{title}</h3>
                  <p>{text}</p>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className="lsec" id="updates">
          <div className="lsec-head reveal">
            <span className="leyebrow2">چه خبر؟</span>
            <h2>هر روز بهتر از دیروز.</h2>
            <p>آخرین تغییرها و چیزهایی که تازه اضافه شده‌اند.</p>
          </div>
          <ol className="lversions">
            {VERSIONS.map((v, i) => (
              <li className="lver reveal" key={v.v} style={{ transitionDelay: `${i * 55}ms` }}>
                <span className="lver-pill">{v.v}</span>
                <div>
                  <h3>
                    {v.title}
                    {v.tag && <span className="lver-tag">{v.tag}</span>}
                  </h3>
                  <p>{v.text}</p>
                </div>
              </li>
            ))}
          </ol>
        </section>

        <section className="lsec" id="faq">
          <div className="lsec-head reveal">
            <span className="leyebrow2">سؤال‌ها</span>
            <h2>چند سؤال، قبل از شروع.</h2>
          </div>
          <div className="lfaq-wrap reveal">
            {FAQS.map((item) => (
              <details className="lfaq" key={item.q}>
                <summary>{item.q}</summary>
                <p>{item.a}</p>
              </details>
            ))}
          </div>
        </section>

        <section className="lcta">
          <div className="lcta-inner reveal">
            <h2>جمعت را بیاور.</h2>
            <p>یک حساب بساز؛ کانال‌ها آماده‌اند. بقیه‌اش را خودت می‌دانی.</p>
            <div className="lcta-actions">
              <button className="lbtn lbtn-primary lbtn-lg" onClick={enter}>
                <LogIn size={17} />
                ورود به گپ
              </button>
              <a className="lbtn lbtn-ghost lbtn-lg" href="#faq">
                سؤال داری؟
                <ArrowUpRight size={16} />
              </a>
            </div>
            <p className="lcta-hint">ثبت‌نام چند ثانیه‌ای است — فقط یک نام کاربری و رمز.</p>
          </div>
        </section>
      </main>

      <footer className="lfoot">
        <div className="lfoot-inner">
          <div className="lfoot-brand-col">
            <div className="lfoot-brand">
              <Logo size={26} />
              <b>مهیار گپ</b>
            </div>
            <p>یک گپ کوچک و صمیمی برای رفیق‌ها؛ چت، ویس و رادیو، بدون شلوغی.</p>
          </div>
          <div>
            <h3>گپ</h3>
            <ul>
              <li>
                <button onClick={enter}>ورود به گپ</button>
              </li>
              <li>
                <a href="#features">قابلیت‌ها</a>
              </li>
              <li>
                <a href="#voice">ویس و رادیو</a>
              </li>
            </ul>
          </div>
          <div>
            <h3>بیشتر</h3>
            <ul>
              <li>
                <a href="#updates">چه خبر؟</a>
              </li>
              <li>
                <a href="#faq">سؤال‌ها</a>
              </li>
              <li>
                <a href="#top" onClick={top}>
                  بالای صفحه
                </a>
              </li>
            </ul>
          </div>
        </div>
        <div className="lfoot-bottom">
          <span>ساخته‌شده برای گپ‌های شبانه 🌙</span>
          <span>v1.3</span>
        </div>
      </footer>
    </div>
  );
}

/* ── ماکت صفحه‌ی اپ (بدون تصویر، فقط CSS) ── */
function AppMock() {
  return (
    <div className="mk-wrap" aria-hidden="true">
      <div className="mk">
        <div className="mk-bar">
          <span className="mk-dot" />
          <span className="mk-dot" />
          <span className="mk-dot" />
          <em>mahyar-gap.app</em>
        </div>
        <div className="mk-inner">
          <div className="mk-side">
            <div className="mk-brand">
              <Logo size={15} />
              مهیار گپ
            </div>
            <div className="mk-sec">کانال‌های متنی</div>
            <div className="mk-item on">
              <span className="mk-hash">#</span> گپ عمومی
              <span className="mk-badge">۲</span>
            </div>
            <div className="mk-item">
              <span className="mk-hash">#</span> موزیک
            </div>
            <div className="mk-item">
              <span className="mk-hash">#</span> گیمینگ
            </div>
            <div className="mk-sec">ویس</div>
            <div className="mk-item">
              <Volume2 size={11} /> لانژ عمومی
              <span className="mk-count">۳</span>
            </div>
            <div className="mk-members">
              <MiniAvatar color="#8b5cf6" name="م" size={15} />
              <MiniAvatar color="#f472b6" name="س" size={15} />
              <MiniAvatar color="#38bdf8" name="ر" size={15} />
            </div>
            <div className="mk-item">
              <Volume2 size={11} /> گیمینگ
              <span className="mk-radio">📻</span>
            </div>
            <div className="mk-me">
              <MiniAvatar color="#8b5cf6" name="م" size={18} />
              مهیار
              <Mic size={10} style={{ marginInlineStart: 'auto', color: '#8b93a8' }} />
            </div>
          </div>

          <div className="mk-main">
            <div className="mk-head">
              <span className="mk-hash">#</span> گپ عمومی
              <span>۴ نفر آنلاین</span>
            </div>
            <div className="mk-msgs">
              <div className="mk-msg">
                <MiniAvatar color="#38bdf8" name="ر" size={20} />
                <div className="mk-msg-body">
                  <div className="mk-name" style={{ color: '#38bdf8' }}>
                    رضا
                  </div>
                  <div className="mk-bubble">کی میاد ویس؟ 🎧</div>
                </div>
              </div>
              <div className="mk-msg">
                <MiniAvatar color="#f472b6" name="س" size={20} />
                <div className="mk-msg-body">
                  <div className="mk-name" style={{ color: '#f472b6' }}>
                    سارا
                  </div>
                  <div className="mk-bubble">ده دقیقه دیگه‌ام</div>
                </div>
              </div>
              <div className="mk-msg">
                <MiniAvatar color="#8b5cf6" name="م" size={20} />
                <div className="mk-msg-body">
                  <div className="mk-name" style={{ color: '#a78bfa' }}>
                    مهیار
                  </div>
                  <div className="mk-bubble">رادیو رو روشن کردم، بیاید 📻</div>
                  <div className="mk-reacts">
                    <span className="mk-react">👍 ۳</span>
                    <span className="mk-react">🔥 ۱</span>
                  </div>
                </div>
              </div>
              <div className="mk-typing">
                سارا دارد تایپ می‌کند
                <i />
                <i />
                <i />
              </div>
            </div>
            <div className="mk-input">
              <span>پیامت را بنویس…</span>
              <b dir="ltr">/mp</b>
            </div>
          </div>
        </div>
      </div>

      <div className="mk-float a">
        <span className="mk-live" /> ۳ نفر تو ویس
      </div>
      <div className="mk-float b">
        <Equalizer color="#f472b6" bars={4} height={13} />
        پاپ فارسی
      </div>
    </div>
  );
}

function MiniAvatar({ color, name, size = 20 }) {
  return (
    <span
      className="mk-ava"
      style={{
        width: size,
        height: size,
        fontSize: Math.max(7, size * 0.44),
        background: `linear-gradient(135deg, ${color}, color-mix(in srgb, ${color} 45%, #0a0c12))`
      }}
    >
      {name}
    </span>
  );
}

/* ── ماکت استیج ویس ── */
function VoiceBoard() {
  return (
    <div className="vb" aria-hidden="true">
      <div className="vb-head">
        <Volume2 size={13} /> لانژ عمومی
        <span>۳ نفر</span>
      </div>
      <div className="vb-tiles">
        <div className="vb-tile speak">
          <span
            className="vb-ava"
            style={{ background: 'linear-gradient(135deg, #8b5cf6, #4c1d95)' }}
          >
            م
          </span>
          <span className="vb-name">
            مهیار <Mic size={10} />
          </span>
        </div>
        <div className="vb-tile">
          <span
            className="vb-ava"
            style={{ background: 'linear-gradient(135deg, #f472b6, #9d174d)' }}
          >
            س
          </span>
          <span className="vb-name">
            سارا <MicOff size={10} />
          </span>
        </div>
        <div className="vb-tile">
          <span
            className="vb-ava"
            style={{ background: 'linear-gradient(135deg, #38bdf8, #0c4a6e)' }}
          >
            ر
          </span>
          <span className="vb-name">
            رضا <Mic size={10} />
          </span>
        </div>
      </div>
      <div className="vb-radio">
        <Equalizer color="#f472b6" bars={5} height={18} />
        <span>
          <span className="vb-rname">رادیو پاپ فارسی</span>
          <br />
          <span className="vb-sub">روشن‌کننده: مهیار</span>
        </span>
        <span className="vb-rvol">
          <Volume2 size={12} />
          <span className="vb-rtrack">
            <i />
          </span>
        </span>
      </div>
      <div className="vb-vol">
        <b>رضا</b>
        <span>بلندی صدای این نفر</span>
        <span className="vb-rtrack">
          <i />
        </span>
      </div>
    </div>
  );
}
