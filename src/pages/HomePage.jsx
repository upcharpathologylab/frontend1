import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowRight,
  ChevronDown,
  ClipboardList,
  Droplet,
  FileText,
  Grid2X2,
  HeartPulse,
  Home as HomeIcon,
  LockKeyhole,
  MapPin,
  Menu,
  MessageCircle,
  Mic,
  Package,
  Plus,
  Search,
  ShieldCheck,
  ShieldPlus,
  ShoppingCart,
  Star,
  TestTube2,
  UserRound,
  X,
  Zap
} from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { assetUrl, getFeaturedServiceLocation, getHomeData, getHomepageBanners, getPackages, getPageContent, getTestimonials, getTests } from "../api/api.js";
import Footer from "../components/Footer.jsx";
import Header from "../components/Header.jsx";
import Logo from "../components/Logo.jsx";
import { getStoredUser } from "../components/auth/authStorage.js";
import { fallbackHomeData, mergeHomeData } from "../data/homeData.js";
import { addCartItem, cartEventName, cartItemKey, getCartCount, getCartItems, hasCartItem } from "../utils/cart.js";
import { resolveContactInfo } from "../utils/contactInfo.js";
import { applyHomeContentOverrides, getContentSection } from "../utils/contentOverrides.js";
import { price } from "../utils.js";
import BlogSection from "../sections/BlogSection.jsx";
import BookingMapSection from "../sections/BookingMapSection.jsx";
import HeroSection from "../sections/HeroSection.jsx";
import HowItWorksSection from "../sections/HowItWorksSection.jsx";
import ReviewsSection from "../sections/ReviewsSection.jsx";
import SearchSection from "../sections/SearchSection.jsx";
import SpecialCareSection from "../sections/SpecialCareSection.jsx";
import TrustedTestsSection from "../sections/TrustedTestsSection.jsx";
import VitalOrgansSection from "../sections/VitalOrgansSection.jsx";
import WhyChooseSection from "../sections/WhyChooseSection.jsx";

const normalizeHomePackage = (item, index) => ({
  ...item,
  id: item.id || item._id || item.packageCode || `home-package-${index + 1}`,
  name: item.packageName || item.name || "Health Package",
  testCount: item.testsIncluded || item.testCount || "",
  originalPrice: item.price ?? item.originalPrice ?? 0,
  discountedPrice: item.finalPrice ?? item.discountedPrice ?? item.price ?? item.originalPrice ?? 0,
  discount: item.discountPercent ? `${item.discountPercent}% OFF` : item.discount || "",
  image: assetUrl(item.packageImage || item.image || ""),
  icon: item.icon || "Gift",
  color: item.color || "green",
  buttonText: item.buttonText || "Book Now",
  buttonLink: item.buttonLink || (item.buttonUrl && item.buttonUrl !== "/cart" ? item.buttonUrl : ""),
  homeCollection: item.homeCollection ?? true,
  reportTime: item.reportTime || "24 - 36 hrs",
  badge: item.badge || (item.isPopular ? "Most Booked" : ""),
  isActive: item.isActive !== false && item.status !== "Inactive"
});

const normalizeHomeTest = (item, index) => ({
  ...item,
  id: item.id || item._id || item.testCode || `home-test-${index + 1}`,
  name: item.testName || item.name || "Pathology Test",
  subtitle: item.description || item.subtitle || item.category || "Pathology test",
  originalPrice: item.price ?? item.originalPrice ?? 0,
  discountedPrice: item.finalPrice ?? item.discountedPrice ?? item.price ?? item.originalPrice ?? 0,
  discount: item.discountPercent ? `${item.discountPercent}% OFF` : item.discount || "",
  image: assetUrl(item.testImage || item.image || ""),
  icon: item.icon || "TestTube2",
  color: item.badgeType || item.color || "green",
  badge: item.badge || "",
  homeCollection: item.homeCollection ?? true,
  reportTime: item.reportTime || "24 hrs",
  rating: item.rating ?? 4.6,
  isActive: item.isActive !== false && item.status !== "Inactive"
});

const fallbackPackages = fallbackHomeData.packages.map(normalizeHomePackage).filter((item) => item.isActive);
const fallbackTests = fallbackHomeData.tests.map(normalizeHomeTest).filter((item) => item.isActive);

const formatReviewDate = (value) => {
  if (!value) return "Recently";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("en-IN", { year: "numeric", month: "short", day: "numeric" });
};

const slugify = (value, fallback) =>
  String(value || fallback || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

const extractBlogCards = (content) => {
  if (Array.isArray(content)) return content;

  const sectionCards = content?.sections?.find((section) => section.sectionKey === "hero" || section.sectionKey === "blog")?.cards;
  const candidates = [
    content?.blogCards,
    content?.cards,
    content?.data?.blogCards,
    content?.data?.cards,
    sectionCards
  ];

  return candidates.find(Array.isArray) || [];
};

const isActiveBlog = (blog = {}) => {
  const status = String(blog.status ?? "").trim().toLowerCase();
  return blog.isActive === true || blog.status === true || status === "active" || status === "published";
};

const bannerToHero = (banner, fallbackHero) => {
  if (!banner) return fallbackHero;

  const featureLabels = [banner.feature1, banner.feature2, banner.feature3, banner.feature4].filter(Boolean);
  const fallbackTrustPoints = fallbackHero.trustPoints || [];
  const trustPoints = (featureLabels.length ? featureLabels : fallbackTrustPoints.map((point) => point.label)).map((label, index) => ({
    label,
    icon: fallbackTrustPoints[index]?.icon || "BadgeCheck"
  }));
  const offerText = [banner.offerText, banner.offerHighlightText].filter(Boolean).join(" on ");

  return {
    ...fallbackHero,
    title: banner.headingLine1 || banner.bannerTitle || fallbackHero.title,
    highlightText: banner.headingHighlightText || "",
    subtitle: banner.description || banner.bannerDescription || fallbackHero.subtitle,
    trustPoints,
    buttons: [
      {
        label: banner.primaryButtonText || banner.buttonText || fallbackHero.buttons?.[0]?.label || "Book Test Now",
        href: banner.primaryButtonUrl || banner.linkUrl || fallbackHero.buttons?.[0]?.href || "#booking",
        variant: "primary"
      },
      {
        label: banner.secondaryButtonText || fallbackHero.buttons?.[1]?.label || "View Packages",
        href: banner.secondaryButtonUrl || fallbackHero.buttons?.[1]?.href || "#packages",
        variant: "outline"
      }
    ],
    offerText: offerText || fallbackHero.offerText,
    image: assetUrl(banner.bannerImage) || fallbackHero.image
  };
};

function SectionSkeleton({ className = "bg-white" }) {
  return (
    <section className={`border-b border-blue-100 py-12 ${className}`}>
      <div className="container-page">
        <div className="h-9 w-72 animate-pulse rounded-full bg-blue-100" />
        <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {[0, 1, 2, 3].map((item) => (
            <div className="h-72 animate-pulse rounded-xl border border-blue-100 bg-white shadow-sm" key={item} />
          ))}
        </div>
      </div>
    </section>
  );
}

const uploadPrescriptionPath = "/my-account?tab=upload-prescription";
const mobileCartKeys = () => new Set(getCartItems().map((item) => cartItemKey(item.id, item.type)));

const discountLabel = (item) => {
  if (item.discount) return item.discount;
  const original = Number(item.originalPrice || 0);
  const current = Number(item.discountedPrice || 0);
  if (original > current && current > 0) return `${Math.round(((original - current) / original) * 100)}% OFF`;
  return "BEST PRICE";
};

const savingText = (item) => {
  const original = Number(item.originalPrice || 0);
  const current = Number(item.discountedPrice || 0);
  return original > current && current > 0 ? `You Save ${price(original - current)}` : "Best value";
};

function HomePage() {
  const navigate = useNavigate();
  const [homeData, setHomeData] = useState(null);
  const [homeContent, setHomeContent] = useState(null);
  const [contactContent, setContactContent] = useState(null);
  const [blogContent, setBlogContent] = useState(null);
  const [homepageBanners, setHomepageBanners] = useState([]);
  const [homepageBannersLoaded, setHomepageBannersLoaded] = useState(false);
  const [homePackages, setHomePackages] = useState([]);
  const [packagesLoaded, setPackagesLoaded] = useState(false);
  const [homeTests, setHomeTests] = useState([]);
  const [testsLoaded, setTestsLoaded] = useState(false);
  const [blogsLoaded, setBlogsLoaded] = useState(false);
  const [testimonials, setTestimonials] = useState([]);
  const [testimonialsLoaded, setTestimonialsLoaded] = useState(false);
  const [testimonialsFailed, setTestimonialsFailed] = useState(false);
  const [serviceLocation, setServiceLocation] = useState(null);
  const [serviceLocationLoaded, setServiceLocationLoaded] = useState(false);
  const [loading, setLoading] = useState(true);
  const [usingFallback, setUsingFallback] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [mobileQuery, setMobileQuery] = useState("");
  const [mobileAddedKeys, setMobileAddedKeys] = useState(() => mobileCartKeys());
  const [mobileCartCount, setMobileCartCount] = useState(() => getCartCount());

  useEffect(() => {
    let mounted = true;

    getHomeData()
      .then((apiData) => {
        if (mounted) {
          setHomeData(mergeHomeData(apiData));
          setUsingFallback(false);
        }
      })
      .catch(() => {
        if (mounted) {
          setHomeData(fallbackHomeData);
          setUsingFallback(true);
        }
      })
      .finally(() => {
        if (mounted) {
          setLoading(false);
        }
      });

    getPageContent("home")
      .then((content) => {
        if (mounted) setHomeContent(content);
      })
      .catch(() => {});

    getPageContent("contact-us")
      .then((page) => {
        const section = (page?.sections || []).find((item) => item.sectionKey === "contact-info") || null;
        if (mounted) setContactContent(section);
      })
      .catch(() => {});

    getPageContent("blog")
      .then((content) => {
        if (mounted) setBlogContent(content);
      })
      .catch(() => {})
      .finally(() => {
        if (mounted) setBlogsLoaded(true);
      });

    getHomepageBanners()
      .then((data) => {
        if (mounted && Array.isArray(data)) setHomepageBanners(data);
      })
      .catch(() => {})
      .finally(() => {
        if (mounted) setHomepageBannersLoaded(true);
      });

    getPackages()
      .then((data) => {
        if (mounted && Array.isArray(data)) {
          const packages = data.map(normalizeHomePackage).filter((item) => item.isActive);
          setHomePackages(packages);
        }
      })
      .catch(() => {
        if (mounted) setHomePackages(fallbackPackages);
      })
      .finally(() => {
        if (mounted) setPackagesLoaded(true);
      });

    getTests({ activeOnly: true, limit: 16, page: 1, sort: "popular" })
      .then((response) => {
        if (!mounted) return;
        const rows = Array.isArray(response) ? response : response?.data || [];
        const tests = rows.map(normalizeHomeTest).filter((item) => item.isActive);
        setHomeTests(tests);
      })
      .catch(() => {
        if (mounted) setHomeTests(fallbackTests);
      })
      .finally(() => {
        if (mounted) setTestsLoaded(true);
      });

    getTestimonials()
      .then((data) => {
        if (mounted && Array.isArray(data)) setTestimonials(data);
      })
      .catch(() => {
        if (mounted) setTestimonialsFailed(true);
      })
      .finally(() => {
        if (mounted) setTestimonialsLoaded(true);
      });

    getFeaturedServiceLocation()
      .then((data) => {
        if (mounted) setServiceLocation(data || null);
      })
      .catch(() => {})
      .finally(() => {
        if (mounted) setServiceLocationLoaded(true);
      });

    return () => {
      mounted = false;
    };
  }, []);

  const displayHomeData = useMemo(() => {
    const baseData = applyHomeContentOverrides(homeData || fallbackHomeData, homeContent);
    const topBanner = homepageBanners
      .filter((banner) => banner.status === "Active" && banner.isActive !== false)
      .sort((a, b) => Number(a.sortOrder || 0) - Number(b.sortOrder || 0))[0];
    const bannerHero = bannerToHero(topBanner, baseData.hero);
    const reviewData = testimonials.length
      ? testimonials
        .filter((review) => review.isActive !== false && (!review.status || review.status === "Published"))
        .map((review) => ({
          ...review,
          id: review.id || review._id || review.customerName || review.name,
          name: review.name || review.customerName,
          comment: review.comment || review.content || review.testimonialContent,
          image: review.image || review.customerPhoto,
          rating: Number(review.rating || 5),
          reviewDate: formatReviewDate(review.reviewDate || review.addedOn || review.createdAt)
        }))
      : [];
    const blogData = extractBlogCards(blogContent)
      .filter(isActiveBlog)
      .map((blog, index) => ({
        id: blog.id || `blog-${index + 1}`,
        slug: slugify(blog.id || blog.slug || blog.title, `blog-${index + 1}`),
        image: assetUrl(blog.image),
        title: blog.title,
        shortDescription: blog.shortDescription || blog.description,
        content: blog.content || blog.shortDescription || blog.description,
        category: blog.category,
        date: blog.publishDate || blog.date,
        readTime: blog.readTime || "5 min read"
      }));

    return { ...baseData, hero: bannerHero, blogs: blogData, reviews: reviewData };
  }, [homeData, homeContent, blogContent, homepageBanners, testimonials, testimonialsFailed]);
  const packageContent = getContentSection(homeContent, "packages");
  const activePackages = useMemo(() => homePackages.filter((item) => item.isActive), [homePackages]);
  const activeTests = useMemo(() => homeTests.filter((item) => item.isActive), [homeTests]);
  const mobilePackages = useMemo(() => activePackages.slice(0, 4), [activePackages]);
  const mobileTests = useMemo(() => activeTests.slice(0, 4), [activeTests]);
  const contact = resolveContactInfo(contactContent, displayHomeData.siteSettings || {}, serviceLocation);
  const hero = displayHomeData.hero || fallbackHomeData.hero;
  const mobileHeroImage = hero.image || "/images/home-banner.png";
  const mobileSearchResults = useMemo(() => {
    const term = mobileQuery.trim().toLowerCase();
    if (!term) return [];
    return [
      ...activeTests.map((item) => ({ ...item, resultType: "test" })),
      ...activePackages.map((item) => ({ ...item, resultType: "package" }))
    ]
      .filter((item) => `${item.name} ${item.subtitle || ""} ${item.testCount || ""}`.toLowerCase().includes(term))
      .slice(0, 6);
  }, [activePackages, activeTests, mobileQuery]);

  useEffect(() => {
    const syncMobileCart = () => {
      setMobileAddedKeys(mobileCartKeys());
      setMobileCartCount(getCartCount());
    };
    window.addEventListener(cartEventName, syncMobileCart);
    window.addEventListener("storage", syncMobileCart);
    return () => {
      window.removeEventListener(cartEventName, syncMobileCart);
      window.removeEventListener("storage", syncMobileCart);
    };
  }, []);

  const openMobilePrescription = () => {
    setMobileMenuOpen(false);
    if (getStoredUser()) {
      navigate(uploadPrescriptionPath);
      return;
    }
    navigate(`/?auth=signin&returnTo=${encodeURIComponent(uploadPrescriptionPath)}`);
  };

  const openProtectedMobileRoute = (route) => {
    setMobileMenuOpen(false);
    if (getStoredUser()) {
      navigate(route);
      return;
    }
    navigate(`/?auth=signin&returnTo=${encodeURIComponent(route)}`);
  };

  const openMobileLocation = () => {
    const locationQuery = serviceLocation ? `${serviceLocation.centerName || ""} ${serviceLocation.fullAddress || ""}`.trim() : "";
    const locationUrl = serviceLocation?.googlePlaceUrl?.trim()
      || serviceLocation?.googleDirectionUrl?.trim()
      || (locationQuery ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(locationQuery)}` : "");

    if (locationUrl) {
      window.open(locationUrl, "_blank", "noopener,noreferrer");
      return;
    }
    navigate("/contact-us");
  };

  const addMobileCartItem = (item, type) => {
    if (hasCartItem(item.id, type)) return;
    addCartItem({
      id: item.id,
      type,
      name: item.name,
      subtitle: item.subtitle,
      testCount: item.testCount,
      image: item.image,
      price: item.discountedPrice,
      oldPrice: item.originalPrice,
      discount: item.discount,
      quantity: 1
    });
  };
  const mobileCategories = [
    { label: "Blood Tests", icon: Droplet, href: "/tests?search=blood", tone: "red" },
    { label: "Full Body Checkup", icon: UserRound, href: "/packages", tone: "green" },
    { label: "Diabetes Care", icon: Droplet, href: "/tests?search=diabetes", tone: "orange" },
    { label: "Thyroid Tests", icon: HeartPulse, href: "/tests?search=thyroid", tone: "purple" },
    { label: "Heart Health", icon: HeartPulse, href: "/tests?search=heart", tone: "red" },
    { label: "Immunity Boost", icon: ShieldPlus, href: "/packages?search=immunity", tone: "green" },
    { label: "View All", icon: Grid2X2, href: "/tests", tone: "slate" }
  ];
  const mobileNav = [
    { label: "Home", icon: HomeIcon, href: "/" },
    { label: "Tests", icon: TestTube2, href: "/tests" },
    { label: "Packages", icon: Package, href: "/packages" },
    { label: "Reports", icon: FileText, href: "/my-account/reports", protected: true },
    { label: "Profile", icon: UserRound, href: "/my-account", protected: true }
  ];
  const locationLabel = serviceLocation?.areaLabel || serviceLocation?.city || serviceLocation?.centerName || "Location";

  return (
    <div className="min-h-screen overflow-hidden bg-white">
      <div className="desktop-home-shell">
        <Header data={displayHomeData} />
        <main className="pt-[68px] md:pt-[104px] lg:pt-[108px]">
          {homepageBannersLoaded ? (
            <HeroSection data={displayHomeData} loading={loading} tests={activeTests} packages={activePackages} />
          ) : (
            <section className="relative min-h-[430px] overflow-hidden bg-navy-950 lg:h-[350px] lg:min-h-0">
              <div className="absolute inset-x-0 bottom-0 h-1 animate-pulse bg-upchar-green" />
            </section>
          )}
          <SearchSection
            quickCards={displayHomeData.quickCards}
            whatsappNumber={displayHomeData.siteSettings.whatsappNumber}
            tests={activeTests}
            packages={activePackages}
          />
          {packagesLoaded ? <SpecialCareSection packages={activePackages} content={packageContent} /> : <SectionSkeleton className="bg-gradient-to-b from-white to-blue-50/40" />}
          <VitalOrgansSection organs={displayHomeData.organs} />
          {testsLoaded ? <TrustedTestsSection tests={activeTests} content={getContentSection(homeContent, "trusted-tests")} /> : <SectionSkeleton className="bg-gradient-to-b from-blue-50/40 to-white" />}
          <WhyChooseSection features={displayHomeData.whyChoose} content={getContentSection(homeContent, "why-choose")} />
          <HowItWorksSection steps={displayHomeData.howItWorks} />
          {testimonialsLoaded ? <ReviewsSection reviews={displayHomeData.reviews} content={getContentSection(homeContent, "testimonials")} /> : <SectionSkeleton />}
          {blogsLoaded ? <BlogSection blogs={displayHomeData.blogs} content={getContentSection(blogContent, "hero") || getContentSection(homeContent, "blog")} /> : <SectionSkeleton className="bg-gradient-to-b from-blue-50/40 to-white" />}
          <BookingMapSection
            data={displayHomeData}
            content={getContentSection(homeContent, "cta")}
            tests={activeTests}
            packages={activePackages}
            serviceLocation={serviceLocation}
            serviceLocationLoaded={serviceLocationLoaded}
          />
        </main>
        <Footer data={displayHomeData} serviceLocation={serviceLocation} />
      </div>

      <div className="mobile-home-shell">
        <header className="mobile-home-header">
          <button type="button" className="mobile-icon-button" onClick={() => setMobileMenuOpen((value) => !value)} aria-label="Open menu">
            {mobileMenuOpen ? <X /> : <Menu />}
          </button>
          <Logo />
          <button type="button" className="mobile-location-pill" onClick={openMobileLocation}>
            <MapPin />
            <span>{locationLabel}</span>
            <ChevronDown />
          </button>
          <Link className="mobile-cart-button" to="/cart" aria-label="Cart">
            <ShoppingCart />
            {mobileCartCount > 0 && <span>{mobileCartCount}</span>}
          </Link>
        </header>

        {mobileMenuOpen && (
          <nav className="mobile-home-menu">
            {["Home", "About Us", "Packages", "Tests", "Contact Us"].map((label) => (
              <Link key={label} to={label === "Home" ? "/" : `/${label.toLowerCase().replace(/\s+/g, "-")}`} onClick={() => setMobileMenuOpen(false)}>
                {label}
              </Link>
            ))}
          </nav>
        )}

        <main className="mobile-home-main">
          <section className="mobile-hero-card">
            <div className="mobile-hero-copy">
              <span>Limited Time Offer</span>
              <h1>UP TO <strong>60% OFF</strong></h1>
              <p>on Selected Health Packages</p>
              <div className="mobile-hero-features">
                {(hero.trustPoints || []).slice(0, 4).map((point) => (
                  <div key={point.label}>
                    <ShieldCheck />
                    <small>{point.label}</small>
                  </div>
                ))}
              </div>
              <button type="button" onClick={() => navigate("/packages")}>
                Book Now <ArrowRight />
              </button>
            </div>
            <img src={mobileHeroImage} alt="Upchar health packages" />
            <div className="mobile-hero-dots"><i /><i /><i /></div>
          </section>

          <section className="mobile-search-panel">
            <div className="mobile-search-bar">
              <Search />
              <input
                value={mobileQuery}
                onChange={(event) => setMobileQuery(event.target.value)}
                placeholder="Search for tests, packages..."
              />
              <button type="button" aria-label="Voice search"><Mic /></button>
            </div>
            {mobileSearchResults.length > 0 && (
              <div className="mobile-search-results">
                {mobileSearchResults.map((item) => (
                  <Link
                    key={`${item.resultType}-${item.id}`}
                    to={item.resultType === "package" ? "/packages" : "/tests"}
                    onClick={() => setMobileQuery("")}
                  >
                    <span>{item.resultType}</span>
                    <strong>{item.name}</strong>
                    <small>{price(item.discountedPrice || item.originalPrice || 0)}</small>
                  </Link>
                ))}
              </div>
            )}
          </section>

          <section className="mobile-category-card">
            {mobileCategories.map(({ label, icon: CategoryIcon, href, tone }) => (
              <Link key={label} to={href} className={`mobile-category-item mobile-tone-${tone}`}>
                <span><CategoryIcon /></span>
                <strong>{label}</strong>
              </Link>
            ))}
          </section>

          <section className="mobile-prescription-card">
            <div className="mobile-prescription-icon"><ClipboardList /></div>
            <div>
              <h2>Upload Prescription</h2>
              <p>Upload your prescription & get FLAT 10% OFF</p>
              <div>
                <span><Zap /> Quick & Easy</span>
                <span><ShieldCheck /> 100% Secure</span>
                <span><LockKeyhole /> Confidential</span>
              </div>
            </div>
            <button type="button" onClick={openMobilePrescription}>Upload Now <ArrowRight /></button>
          </section>

          <section className="mobile-product-section">
            <div className="mobile-section-heading">
              <h2>Popular Health Packages</h2>
              <Link to="/packages">View All <ArrowRight /></Link>
            </div>
            <div className="mobile-card-grid">
              {mobilePackages.map((item) => {
                const isAdded = mobileAddedKeys.has(cartItemKey(item.id, "package"));
                return (
                  <article className="mobile-package-card" key={item.id}>
                    <div className="mobile-card-image">
                      <img src={item.image} alt={item.name} />
                      <span>{discountLabel(item)}</span>
                    </div>
                    <div className="mobile-card-body">
                      <h3>{item.name}</h3>
                      <p>{item.testCount || "Health Package"}</p>
                      <div className="mobile-price-row">
                        <del>{price(item.originalPrice || item.discountedPrice || 0)}</del>
                        <strong>{price(item.discountedPrice || item.originalPrice || 0)}</strong>
                      </div>
                      <small>{savingText(item)}</small>
                      <button type="button" className={isAdded ? "is-added" : ""} onClick={() => addMobileCartItem(item, "package")}>
                        <ShoppingCart /> {isAdded ? "Added" : "Add to Cart"}
                      </button>
                    </div>
                  </article>
                );
              })}
            </div>
          </section>

          <section className="mobile-product-section">
            <div className="mobile-section-heading">
              <h2>Popular Tests</h2>
              <Link to="/tests">View All Tests <ArrowRight /></Link>
            </div>
            <div className="mobile-card-grid">
              {mobileTests.map((item) => {
                const isAdded = mobileAddedKeys.has(cartItemKey(item.id, "test"));
                return (
                  <article className="mobile-test-card" key={item.id}>
                    <div className="mobile-card-image">
                      <img src={item.image} alt={item.name} />
                      <span>{discountLabel(item)}</span>
                    </div>
                    <div className="mobile-card-body">
                      <h3>{item.name}</h3>
                      <p>{item.subtitle}</p>
                      <div className="mobile-price-row">
                        <del>{price(item.originalPrice || item.discountedPrice || 0)}</del>
                        <strong>{price(item.discountedPrice || item.originalPrice || 0)}</strong>
                      </div>
                      <button type="button" className={`mobile-add-circle ${isAdded ? "is-added" : ""}`} onClick={() => addMobileCartItem(item, "test")}>
                        <Plus />
                      </button>
                    </div>
                  </article>
                );
              })}
            </div>
          </section>

          <section className="mobile-trust-help">
            <div>
              <strong>Trusted by 10,000+ Happy Customers</strong>
              <p><b>4.8</b> <Star /><Star /><Star /><Star /><Star /> <span>(2,500+ Reviews)</span></p>
            </div>
            <a href={contact.whatsappHref || `https://wa.me/${displayHomeData.siteSettings.whatsappNumber}`} target="_blank" rel="noreferrer">
              <MessageCircle />
              <span><strong>Need Help?</strong> Chat on WhatsApp</span>
            </a>
          </section>
        </main>

        <nav className="mobile-bottom-nav">
          {mobileNav.slice(0, 3).map(({ label, icon: NavIcon, href }) => (
            <Link key={label} to={href}><NavIcon /><span>{label}</span></Link>
          ))}
          <button type="button" className="mobile-upload-nav" onClick={openMobilePrescription}>
            <ClipboardList /><span>Upload<br />Prescription</span>
          </button>
          {mobileNav.slice(3).map(({ label, icon: NavIcon, href, protected: protectedRoute }) => (
            protectedRoute ? (
              <button type="button" key={label} onClick={() => openProtectedMobileRoute(href)}>
                <NavIcon /><span>{label}</span>
              </button>
            ) : (
              <Link key={label} to={href}><NavIcon /><span>{label}</span></Link>
            )
          ))}
        </nav>
      </div>

      <AnimatePresence>
        {usingFallback && !loading && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="fixed bottom-5 left-1/2 z-50 w-[calc(100%-2rem)] max-w-md -translate-x-1/2 rounded-lg border border-blue-100 bg-white px-4 py-3 text-center text-sm font-semibold text-navy-700 shadow-soft"
          >
            Backend is offline, so demo home content is being shown.
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default HomePage;
