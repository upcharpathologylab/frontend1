import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowRight,
  Check,
  ChevronDown,
  ClipboardList,
  FileText,
  Home as HomeIcon,
  MapPin,
  Menu,
  Package,
  Plus,
  Search,
  ShieldCheck,
  ShoppingCart,
  Star,
  TestTube2,
  UserRound,
  X
} from "lucide-react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { imageUrl, getFeaturedServiceLocation, getHomeData, getHomepageBanners, getPackages, getPageContent, getTestimonials, getTests } from "../api/api.js";
import Footer from "../components/Footer.jsx";
import Header from "../components/Header.jsx";
import AuthModal from "../components/auth/AuthModal.jsx";
import Icon from "../components/Icon.jsx";
import Logo from "../components/Logo.jsx";
import SmartImage from "../components/SmartImage.jsx";
import upcharLogo from "../assets/upchar-logo.webp";
import { getStoredUser } from "../components/auth/authStorage.js";
import { fallbackHomeData, mergeHomeData } from "../data/homeData.js";
import { addCartItem, cartEventName, cartItemKey, getCartCount, getCartItems, hasCartItem } from "../utils/cart.js";
import { getContentSection } from "../utils/contentOverrides.js";
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
  image: imageUrl(item.packageImage || item.image || item.imageUrl || item.thumbnail || item.bannerImage || item.coverImage || item.images?.[0] || "", item.updatedAt || item.createdAt),
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
  image: imageUrl(item.testImage || item.image || item.imageUrl || item.thumbnail || item.bannerImage || item.coverImage || item.images?.[0] || "", item.updatedAt || item.createdAt),
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

const isActiveBanner = (banner = {}) => {
  const status = String(banner.status ?? "").trim().toLowerCase();
  return banner.isActive !== false && !["inactive", "archived", "draft"].includes(status);
};

const bannerImageValue = (banner = {}) =>
  banner.bannerImage || banner.image || banner.imageUrl || banner.bannerImageUrl || "";

const mobileImageValue = (item = {}, type = "") => {
  if (type === "package") {
    return imageUrl(item.image || item.packageImage || item.imageUrl || item.thumbnail || item.bannerImage || item.coverImage || item.images?.[0] || "", item.updatedAt || item.createdAt);
  }
  if (type === "test") {
    return imageUrl(item.image || item.testImage || item.imageUrl || item.thumbnail || item.bannerImage || item.coverImage || item.images?.[0] || "", item.updatedAt || item.createdAt);
  }
  return imageUrl(item.image || item.imageUrl || item.thumbnail || item.bannerImage || item.coverImage || item.images?.[0] || "", item.updatedAt || item.createdAt);
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
  const image = bannerImageValue(banner);

  return {
    ...fallbackHero,
    id: banner.id || banner._id || fallbackHero.id,
    updatedAt: banner.updatedAt || banner.createdAt || fallbackHero.updatedAt,
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
    image: imageUrl(image, banner.updatedAt || banner.createdAt) || ""
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

const profilePath = "/profile";
const uploadPrescriptionPath = `${profilePath}?section=upload-prescription`;
const reportsPath = `${profilePath}?section=reports`;
const mobileCartKeys = () => new Set(getCartItems().map((item) => cartItemKey(item.id, item.type)));
const loopItems = (items = []) => (items.length > 1 ? [...items, ...items] : items);

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
  const location = useLocation();
  const [homeData, setHomeData] = useState(null);
  const [homeContent, setHomeContent] = useState(null);
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
  const [mobileAuthOpen, setMobileAuthOpen] = useState(false);
  const [mobileAuthMode, setMobileAuthMode] = useState("signin");
  const mobileAuthReturnToRef = useRef(profilePath);
  const mobileOrgansRef = useRef(null);
  const mobilePackagesRef = useRef(null);
  const mobileTestsRef = useRef(null);
  const mobileReviewsRef = useRef(null);
  const mobileWhyRef = useRef(null);
  const mobileHowRef = useRef(null);
  const mobileBlogsRef = useRef(null);
  const pausedMobileSlidersRef = useRef(new Set());
  const mobileSliderStateRef = useRef(new Map());

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
    const baseData = homeData || fallbackHomeData;
    const topBanner = homepageBanners
      .filter((banner) => isActiveBanner(banner) && bannerImageValue(banner))
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
        image: imageUrl(blog.image || blog.imageUrl || blog.thumbnail || "", blog.updatedAt || blog.publishDate || blog.date),
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
  const activeHomepageBanners = useMemo(
    () =>
      homepageBanners
        .filter((banner) => isActiveBanner(banner) && bannerImageValue(banner))
        .sort((a, b) => Number(a.sortOrder || 0) - Number(b.sortOrder || 0)),
    [homepageBanners]
  );
  const heroSlides = useMemo(() => {
    if (!homepageBannersLoaded) return [];
    const slides = activeHomepageBanners.map((banner) => bannerToHero(banner, fallbackHomeData.hero));
    if (!slides.length && loading) return [];
    return slides.length ? slides : [displayHomeData.hero || fallbackHomeData.hero];
  }, [activeHomepageBanners, displayHomeData.hero, homepageBannersLoaded, loading]);
  const heroReady = heroSlides.length > 0;
  const mobilePackages = useMemo(() => activePackages.slice(0, 4), [activePackages]);
  const mobileTests = useMemo(() => activeTests.slice(0, 4), [activeTests]);

  useEffect(() => {
    const firstHeroImage = homepageBannersLoaded ? imageUrl(heroSlides[0]?.image, heroSlides[0]?.updatedAt) : "";
    if (typeof document === "undefined") return undefined;

    const preloaded = [];
    const addPreload = (href, options = {}) => {
      if (!href || document.head.querySelector(`link[rel="preload"][as="image"][href="${href}"]`)) return;
      const preload = document.createElement("link");
      preload.rel = "preload";
      preload.as = "image";
      preload.href = href;
      preload.fetchPriority = options.fetchPriority || "high";
      if (options.imageSizes) preload.imageSizes = options.imageSizes;
      document.head.appendChild(preload);
      preloaded.push(preload);
    };

    addPreload(upcharLogo, { fetchPriority: "high" });
    addPreload(firstHeroImage, { fetchPriority: "high", imageSizes: "100vw" });

    return () => {
      preloaded.forEach((preload) => preload.remove());
    };
  }, [heroSlides, homepageBannersLoaded]);

  const openHeroLink = (href = "/packages") => {
    if (!href || href === "#booking" || href.startsWith("#")) {
      navigate("/packages");
      return;
    }
    navigate(href);
  };

  const isUploadPrescriptionAction = (button = {}) =>
    String(button.label || "").toLowerCase().includes("prescription") ||
    String(button.href || "").toLowerCase().includes("upload-prescription");

  const openMobileHeroAction = (button) => {
    if (isUploadPrescriptionAction(button)) {
      openMobilePrescription();
      return;
    }
    openHeroLink(button?.href);
  };
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

  const searchResultPath = (item) => {
    const slug = slugify(item.slug || item.packageSlug || item.testSlug || item.id || item.name, item.id);
    return `/${item.resultType === "package" ? "packages" : "tests"}/${slug}`;
  };

  const openMobileSearchResult = (item) => {
    setMobileQuery("");
    navigate(searchResultPath(item));
  };

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

  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia("(max-width: 768px)").matches) return undefined;
    const refs = [mobileOrgansRef, mobilePackagesRef, mobileTestsRef, mobileReviewsRef, mobileWhyRef, mobileHowRef, mobileBlogsRef];
    const resumeAfterDelay = (node) => {
      const state = mobileSliderStateRef.current.get(node) || {};
      state.pauseUntil = performance.now() + 1000;
      state.isAnimating = false;
      state.animationStart = 0;
      state.startScrollLeft = node.scrollLeft;
      state.targetScrollLeft = node.scrollLeft;
      mobileSliderStateRef.current.set(node, state);
      pausedMobileSlidersRef.current.delete(node);
    };
    const cleanupHandlers = refs
      .map((ref) => ref.current)
      .filter(Boolean)
      .map((node) => {
        const pause = () => pausedMobileSlidersRef.current.add(node);
        const resume = () => resumeAfterDelay(node);
        node.addEventListener("touchstart", pause, { passive: true });
        node.addEventListener("touchend", resume, { passive: true });
        node.addEventListener("touchcancel", resume, { passive: true });
        node.addEventListener("mouseenter", pause);
        node.addEventListener("mouseleave", resume);
        return () => {
          node.removeEventListener("touchstart", pause);
          node.removeEventListener("touchend", resume);
          node.removeEventListener("touchcancel", resume);
          node.removeEventListener("mouseenter", pause);
          node.removeEventListener("mouseleave", resume);
        };
      });
    let animationFrame = 0;
    const pauseDuration = 1000;
    const slideDuration = 520;

    const getSlideDistance = (node) => {
      const firstCard = node.children[0];
      if (!firstCard) return node.clientWidth;
      const styles = window.getComputedStyle(node);
      const gap = parseFloat(styles.columnGap || styles.gap || "0") || 0;
      return firstCard.getBoundingClientRect().width + gap;
    };

    const animateSliders = (time) => {
      refs.forEach((ref) => {
        const node = ref.current;
        if (!node || node.scrollWidth <= node.clientWidth || pausedMobileSlidersRef.current.has(node)) return;
        const loopWidth = node.dataset.loop === "true" ? node.scrollWidth / 2 : 0;
        if (!loopWidth) return;

        const slideDistance = getSlideDistance(node);
        const existingState = mobileSliderStateRef.current.get(node);
        const state = existingState || {};
        if (!Number.isFinite(state.pauseUntil)) {
          state.pauseUntil = time + pauseDuration;
        }
        if (!existingState) mobileSliderStateRef.current.set(node, state);

        if (time < state.pauseUntil) return;

        if (!state.isAnimating) {
          state.isAnimating = true;
          state.animationStart = time;
          state.startScrollLeft = node.scrollLeft;
          state.targetScrollLeft = node.scrollLeft + slideDistance;
        }

        const progress = Math.min((time - state.animationStart) / slideDuration, 1);
        const easedProgress = 1 - Math.pow(1 - progress, 3);
        node.scrollLeft = state.startScrollLeft + (state.targetScrollLeft - state.startScrollLeft) * easedProgress;

        if (progress >= 1) {
          node.scrollLeft = state.targetScrollLeft;
          if (node.scrollLeft >= loopWidth) {
            node.scrollLeft -= loopWidth;
          }
          state.isAnimating = false;
          state.pauseUntil = time + pauseDuration;
        }
      });

      animationFrame = window.requestAnimationFrame(animateSliders);
    };

    animationFrame = window.requestAnimationFrame(animateSliders);

    return () => {
      window.cancelAnimationFrame(animationFrame);
      cleanupHandlers.forEach((cleanup) => cleanup());
      pausedMobileSlidersRef.current.clear();
      mobileSliderStateRef.current.clear();
    };
  }, [displayHomeData.blogs, displayHomeData.howItWorks, displayHomeData.organs, displayHomeData.reviews, displayHomeData.whyChoose, mobilePackages, mobileTests]);

  const openMobileAuthForRoute = (route) => {
    mobileAuthReturnToRef.current = route;
    setMobileAuthMode("signin");
    setMobileAuthOpen(true);
  };

  const openMobileProtectedRoute = (route) => {
    if (getStoredUser()) {
      navigate(route);
      return;
    }
    openMobileAuthForRoute(route);
  };

  const openMobilePrescription = () => {
    setMobileMenuOpen(false);
    openMobileProtectedRoute(uploadPrescriptionPath);
  };

  const openMobileProfile = () => {
    setMobileMenuOpen(false);
    openMobileProtectedRoute(profilePath);
  };

  const handleMobileAuthSuccess = () => {
    const returnTo = mobileAuthReturnToRef.current || profilePath;
    setMobileAuthOpen(false);
    mobileAuthReturnToRef.current = profilePath;
    navigate(returnTo, { replace: true });
  };

  const handleMobileNavAction = (item) => {
    setMobileMenuOpen(false);
    if (item.action === "upload-prescription") {
      openMobilePrescription();
      return;
    }
    if (item.action === "profile") {
      openMobileProfile();
      return;
    }
    if (item.protected) {
      setMobileMenuOpen(false);
      openMobileProtectedRoute(item.href);
      return;
    }
    navigate(item.href);
  };

  const isMobileNavActive = (item) => {
    if (item.href === "/") return location.pathname === "/";
    return location.pathname === item.href || (item.href === profilePath && location.pathname === "/my-account");
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
      imageUrl: item.imageUrl,
      packageImage: item.packageImage,
      testImage: item.testImage,
      thumbnail: item.thumbnail,
      bannerImage: item.bannerImage,
      coverImage: item.coverImage,
      images: item.images,
      description: item.description,
      badge: item.badge,
      icon: item.icon,
      color: item.color,
      price: item.discountedPrice,
      oldPrice: item.originalPrice,
      discount: item.discount,
      quantity: 1
    });
  };
  const mobileOrgans = displayHomeData.organs?.length ? displayHomeData.organs : [
    { name: "Blood Test", icon: "Droplet", color: "red" },
    { name: "Thyroid Tests", icon: "HeartPulse", color: "purple" },
    { name: "Heart Health", icon: "HeartPulse", color: "red" },
    { name: "Immunity Boost", icon: "ShieldPlus", color: "green" }
  ];
  const mobileNav = [
    { label: "Home", icon: HomeIcon, href: "/" },
    { label: "Tests", icon: TestTube2, href: "/tests" },
    { label: "Packages", icon: Package, href: "/packages" },
    { label: "Upload Prescription", icon: ClipboardList, href: uploadPrescriptionPath, action: "upload-prescription", featured: true },
    { label: "Reports", icon: FileText, href: reportsPath, protected: true },
    { label: "Profile", icon: UserRound, href: profilePath, action: "profile", protected: true }
  ];
  const locationLabel = "Map";
  const mapQuery = serviceLocation ? `${serviceLocation.centerName || ""} ${serviceLocation.fullAddress || ""}`.trim() : "";
  const savedMapEmbed = serviceLocation?.googleMapEmbedUrl?.trim() || "";
  const iframeSrcMatch = savedMapEmbed.match(/src=["']([^"']+)["']/i);
  const normalizedSavedEmbed = iframeSrcMatch?.[1] || savedMapEmbed;
  const hasMapCoordinates = serviceLocation?.latitude != null && serviceLocation?.longitude != null;
  const mobileMapLink = serviceLocation?.googlePlaceUrl?.trim()
    || serviceLocation?.googleDirectionUrl?.trim()
    || (hasMapCoordinates
      ? `https://www.google.com/maps/search/?api=1&query=${serviceLocation.latitude},${serviceLocation.longitude}`
      : mapQuery
        ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(mapQuery)}`
        : "");
  const mobileDirectionLink = serviceLocation?.googleDirectionUrl?.trim()
    || (hasMapCoordinates
      ? `https://www.google.com/maps/dir/?api=1&destination=${serviceLocation.latitude},${serviceLocation.longitude}`
      : mapQuery
        ? `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(mapQuery)}`
        : mobileMapLink);
  const mobileMapEmbedUrl =
    normalizedSavedEmbed.includes("output=embed") || normalizedSavedEmbed.includes("/embed")
      ? normalizedSavedEmbed
      : hasMapCoordinates
      ? `https://maps.google.com/maps?q=${serviceLocation.latitude},${serviceLocation.longitude}&z=15&output=embed`
      : mapQuery
        ? `https://maps.google.com/maps?q=${encodeURIComponent(mapQuery)}&z=15&output=embed`
        : "";

  return (
    <div className="min-h-screen overflow-hidden bg-white">
      <div className="desktop-home-shell">
        <Header data={displayHomeData} />
        <main className="pt-[68px] md:pt-[104px] lg:pt-[108px]">
          {heroReady ? (
            <HeroSection data={displayHomeData} loading={loading} tests={activeTests} packages={activePackages} slides={heroSlides} />
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
            {[
              { label: "Home", href: "/" },
              { label: "About Us", href: "/about-us" },
              { label: "Packages", href: "/packages" },
              { label: "Tests", href: "/tests" },
              { label: "Contact Us", href: "/contact-us" },
              { label: "Govt. Panel", href: "/#booking" },
              { label: "Partnerships", href: "/#booking" }
            ].map((item) => (
              <Link key={item.label} to={item.href} onClick={() => setMobileMenuOpen(false)}>
                {item.label}
              </Link>
            ))}
          </nav>
        )}

        <main className="mobile-home-main">
          {heroReady ? (
            <section className="mobile-hero-slider" aria-label="Health offers">
              <div className="mobile-hero-track">
                {heroSlides.map((slide, index) => {
                  const offerParts = String(slide.offerText || "UP TO 60% OFF on selected health packages").split(" on ");
                  const offerTitle = offerParts[0] || "UP TO 60% OFF";
                  const offerSubtitle = offerParts[1] || slide.highlightText || "Selected Health Packages";
                  const benefits = (slide.trustPoints || [])
                    .map((point) => point.label)
                    .filter((label) => /home|report|fast|sample/i.test(label))
                    .slice(0, 2);
                  const image = mobileImageValue(slide);
                  const primary = slide.buttons?.[0] || { label: "Book Now", href: "/packages" };
                  const secondary = slide.buttons?.[1] || { label: "View Packages", href: "/packages" };

                  return (
                    <article className="mobile-hero-card" key={`${slide.title}-${index}`}>
                      <div className="mobile-hero-copy">
                        <span>Limited Time Offer</span>
                        <h1>{offerTitle}</h1>
                        <p>{offerSubtitle}</p>
                        <div className="mobile-hero-features">
                          {(benefits.length ? benefits : ["Home Sample Collection", "Fast Reports"]).map((label) => (
                            <div key={label}>
                              <ShieldCheck />
                              <small>{label}</small>
                            </div>
                          ))}
                        </div>
                        <div className="mobile-hero-actions">
                          <button type="button" onClick={() => openMobileHeroAction(primary)}>
                            {primary.label || "Book Now"} <ArrowRight />
                          </button>
                          <button type="button" onClick={() => openMobileHeroAction(secondary)}>
                            {secondary.label || "View Packages"}
                          </button>
                        </div>
                      </div>
                      <SmartImage
                        src={image}
                        alt={slide.title || "Upchar health offer"}
                        loading={index === 0 ? "eager" : "lazy"}
                        fetchPriority={index === 0 ? "high" : "auto"}
                        width="430"
                        height="160"
                        sizes="100vw"
                      />
                    </article>
                  );
                })}
              </div>
              <div className="mobile-hero-dots">
                {heroSlides.map((slide, index) => <i key={`${slide.title}-${index}`} />)}
              </div>
            </section>
          ) : (
            <section className="mobile-hero-slider" aria-label="Health offers">
              <div className="mobile-hero-card animate-pulse bg-blue-50" />
            </section>
          )}

          <section className="mobile-search-panel">
            <div className="mobile-search-bar">
              <Search />
              <input
                value={mobileQuery}
                onChange={(event) => setMobileQuery(event.target.value)}
                placeholder="Search for tests, packages..."
              />
              <button type="button" aria-label="Search"><Search /></button>
            </div>
            {mobileSearchResults.length > 0 && (
              <div className="mobile-search-results">
                {mobileSearchResults.map((item) => {
                  const type = item.resultType;
                  const isAdded = mobileAddedKeys.has(cartItemKey(item.id, type));
                  const description = item.description || item.subtitle || item.testCount || item.testsIncluded || "";

                  return (
                    <div
                      className="mobile-search-result-card"
                      key={`${item.resultType}-${item.id}`}
                      role="button"
                      tabIndex={0}
                      onClick={() => openMobileSearchResult(item)}
                      onKeyDown={(event) => {
                        if (event.key === "Enter" || event.key === " ") openMobileSearchResult(item);
                      }}
                    >
                      <span className="mobile-search-result-label">{item.resultType}</span>
                      <div className="mobile-search-result-copy">
                        <strong>{item.name}</strong>
                        {description ? <small>{description}</small> : null}
                      </div>
                      <div className="mobile-search-result-action">
                        <b>{price(item.discountedPrice || item.originalPrice || 0)}</b>
                        <button
                          type="button"
                          onClick={(event) => {
                            event.stopPropagation();
                            if (!isAdded) addMobileCartItem(item, type);
                          }}
                        >
                          {isAdded ? <Check /> : <Plus />}
                          {isAdded ? "Added" : "Add"}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>

          <section className="mobile-product-section">
            <div className="mobile-section-heading">
              <h2>Vital Organs</h2>
              <Link to="/tests">View All <ArrowRight /></Link>
            </div>
            <div className="mobile-category-card" ref={mobileOrgansRef} data-loop={mobileOrgans.length > 1 ? "true" : "false"}>
              {loopItems(mobileOrgans).map((organ, index) => (
              <Link key={`${organ.name}-${index}`} to="/tests" className={`mobile-category-item mobile-tone-${organ.color || "green"}`}>
                <span><Icon name={organ.icon || "Activity"} /></span>
                <strong>{organ.name}</strong>
              </Link>
              ))}
            </div>
          </section>

          <section className="mobile-product-section">
            <div className="mobile-section-heading">
              <h2>Popular Health Packages</h2>
              <Link to="/packages">View All <ArrowRight /></Link>
            </div>
            <div className="mobile-card-grid" ref={mobilePackagesRef} data-loop={mobilePackages.length > 1 ? "true" : "false"}>
              {loopItems(mobilePackages).map((item, index) => {
                const isAdded = mobileAddedKeys.has(cartItemKey(item.id, "package"));
                return (
                  <article className="mobile-package-card" key={`${item.id}-${index}`}>
                    <div className="mobile-card-image">
                      <SmartImage src={mobileImageValue(item, "package")} alt={item.name} width="260" height="130" sizes="64vw" />
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
            <div className="mobile-card-grid" ref={mobileTestsRef} data-loop={mobileTests.length > 1 ? "true" : "false"}>
              {loopItems(mobileTests).map((item, index) => {
                const isAdded = mobileAddedKeys.has(cartItemKey(item.id, "test"));
                return (
                  <article className="mobile-test-card" key={`${item.id}-${index}`}>
                    <div className="mobile-card-image">
                      <SmartImage src={mobileImageValue(item, "test")} alt={item.name} width="260" height="130" sizes="64vw" />
                      <span>{discountLabel(item)}</span>
                    </div>
                    <div className="mobile-card-body">
                      <h3>{item.name}</h3>
                      <p>{item.subtitle}</p>
                      <div className="mobile-price-row">
                        <del>{price(item.originalPrice || item.discountedPrice || 0)}</del>
                        <strong>{price(item.discountedPrice || item.originalPrice || 0)}</strong>
                      </div>
                      <button type="button" className={isAdded ? "is-added" : ""} onClick={() => addMobileCartItem(item, "test")}>
                        <ShoppingCart /> {isAdded ? "Added" : "Add to Cart"}
                      </button>
                    </div>
                  </article>
                );
              })}
            </div>
          </section>

          {displayHomeData.reviews?.length ? (
            <section className="mobile-reviews-section">
              <div className="mobile-section-heading">
                <h2>Patient Reviews</h2>
              </div>
              <div className="mobile-review-slider" ref={mobileReviewsRef} data-loop={displayHomeData.reviews.length > 1 ? "true" : "false"}>
                {loopItems(displayHomeData.reviews.slice(0, 6)).map((review, index) => (
                  <article className="mobile-review-card" key={`${review.id || review.name || "review"}-${index}`}>
                    <div>
                      <strong>{review.name || "Upchar Customer"}</strong>
                      <span><Star /><Star /><Star /><Star /><Star /></span>
                    </div>
                    <p>{review.comment || review.content}</p>
                    <small>{review.reviewDate || "Recently"}</small>
                  </article>
                ))}
              </div>
            </section>
          ) : null}

          {displayHomeData.whyChoose?.length ? (
            <section className="mobile-product-section">
              <div className="mobile-section-heading">
                <h2>Why Choose Upchar?</h2>
              </div>
              <div className="mobile-mini-slider" ref={mobileWhyRef} data-loop={displayHomeData.whyChoose.length > 1 ? "true" : "false"}>
                {loopItems(displayHomeData.whyChoose).map((item, index) => (
                  <article className="mobile-mini-card" key={`${item.title || item.name}-${index}`}>
                    <span><Icon name={item.icon || "ShieldCheck"} /></span>
                    <strong>{item.title || item.name}</strong>
                    <p>{item.description}</p>
                  </article>
                ))}
              </div>
            </section>
          ) : null}

          {displayHomeData.howItWorks?.length ? (
            <section className="mobile-product-section">
              <div className="mobile-section-heading">
                <h2>How It Works</h2>
              </div>
              <div className="mobile-mini-slider" ref={mobileHowRef} data-loop={displayHomeData.howItWorks.length > 1 ? "true" : "false"}>
                {loopItems(displayHomeData.howItWorks).map((item, index) => (
                  <article className="mobile-mini-card" key={`${item.title || "step"}-${index}`}>
                    <span><Icon name={item.icon || "ClipboardList"} /></span>
                    <strong>{item.title}</strong>
                    <p>{item.description}</p>
                  </article>
                ))}
              </div>
            </section>
          ) : null}

          {displayHomeData.blogs?.length ? (
            <section className="mobile-product-section">
              <div className="mobile-section-heading">
                <h2>From Our Blogs</h2>
                <Link to="/blog">View All <ArrowRight /></Link>
              </div>
              <div className="mobile-blog-slider" ref={mobileBlogsRef} data-loop={displayHomeData.blogs.length > 1 ? "true" : "false"}>
                {loopItems(displayHomeData.blogs.slice(0, 8)).map((blog, index) => (
                  <Link className="mobile-blog-card" to={`/blog/${blog.slug}`} key={`${blog.id || blog.slug}-${index}`}>
                    <SmartImage src={mobileImageValue(blog)} alt={blog.title} width="180" height="110" sizes="33vw" />
                    <span>{blog.category || "Health Tips"}</span>
                    <strong>{blog.title}</strong>
                  </Link>
                ))}
              </div>
            </section>
          ) : null}

          {mobileMapEmbedUrl || mobileDirectionLink ? (
            <section className="mobile-map-section">
              <div className="mobile-section-heading">
                <h2>Find Us</h2>
              </div>
              {mobileMapEmbedUrl ? (
                <iframe
                  title={serviceLocation?.centerName || "Upchar Pathology location"}
                  src={mobileMapEmbedUrl}
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                />
              ) : (
                <div className="mobile-map-fallback">
                  <strong>{serviceLocation?.centerName || "Upchar Pathology"}</strong>
                  <p>{serviceLocation?.fullAddress || "Open location in Google Maps."}</p>
                </div>
              )}
              {mobileDirectionLink ? (
                <a className="mobile-direction-button" href={mobileDirectionLink} target="_blank" rel="noreferrer">
                  Get Directions <ArrowRight />
                </a>
              ) : null}
            </section>
          ) : null}
        </main>

        <nav className="mobile-bottom-nav">
          {mobileNav.slice(0, 3).map((item) => {
            const NavIcon = item.icon;
            return (
              <Link key={item.label} to={item.href} className={isMobileNavActive(item) ? "is-active" : ""}>
                <NavIcon />
                <span>{item.label}</span>
              </Link>
            );
          })}
          {mobileNav.slice(3).map((item) => {
            const NavIcon = item.icon;
            return (
              <button
                type="button"
                className={`${item.featured ? "mobile-upload-nav" : ""} ${isMobileNavActive(item) ? "is-active" : ""}`.trim()}
                key={item.label}
                onClick={() => handleMobileNavAction(item)}
                aria-current={isMobileNavActive(item) ? "page" : undefined}
              >
                <NavIcon />
                <span>{item.featured ? <>Upload<br />Prescription</> : item.label}</span>
              </button>
            );
          })}
        </nav>
      </div>

      <AuthModal
        isOpen={mobileAuthOpen}
        mode={mobileAuthMode}
        onModeChange={setMobileAuthMode}
        onClose={() => setMobileAuthOpen(false)}
        onSuccess={handleMobileAuthSuccess}
      />

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
