import ThemeButton from "@/components/DarkMode/ThemeButton/ThemeButton";
import Link from "next/link";
import { AiOutlineDashboard } from "react-icons/ai";
import { PiShoppingCart } from "react-icons/pi";

const Topbar = () => {
  return (
    <div className="w-100 bgn1-color p-3 position-fixed z-3 top-0 d-lg-none d-flex align-items-center justify-content-between br-bottom-n5 box-shadow1">
      <Link href="/" className="side-icon bgn2-color brn4">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="11"
          height="15"
          viewBox="0 0 11 15"
          fill="none"
        >
          <g clipPath="url(#clip0_3569_435)">
            <path
              fillRule="evenodd"
              clipRule="evenodd"
              d="M5.69145 8.43063L1.72801 5.49387L5.69145 2.54023V0L0 4.21303V6.75919L5.69145 10.9887V8.43063Z"
              fill="rgba(var(--p1))"
            />
            <path
              fillRule="evenodd"
              clipRule="evenodd"
              d="M1.72801 5.49387L5.69145 2.54023V0L0 4.21303V6.75919L1.72801 5.49387Z"
              fill="rgba(var(--p1))"
            />
            <path
              fillRule="evenodd"
              clipRule="evenodd"
              d="M4.86328 6.5702L8.82672 9.5065L4.86328 12.4606V15.0004L10.5552 10.7864V8.24163L4.86328 4.01172V6.5702Z"
              fill="rgba(var(--p1))"
            />
            <path
              fillRule="evenodd"
              clipRule="evenodd"
              d="M4.86328 6.5702L8.82672 9.5065L10.5552 10.7864V8.24163L4.86328 4.01172V6.5702Z"
              fill="rgba(var(--p1))"
            />
            <path
              fillRule="evenodd"
              clipRule="evenodd"
              d="M8.72466 2.00391C9.52091 2.00391 10.1657 2.64912 10.1657 3.44491C10.1657 4.24115 9.52091 4.88591 8.72466 4.88591C7.92841 4.88591 7.2832 4.2407 7.2832 3.44491C7.2832 2.64912 7.92841 2.00391 8.72466 2.00391Z"
              fill="rgba(var(--p1))"
            />
            <path
              fillRule="evenodd"
              clipRule="evenodd"
              d="M1.83013 12.9972C1.03388 12.9972 0.388672 12.352 0.388672 11.5562C0.388672 10.7604 1.03388 10.1152 1.82967 10.1152C2.62546 10.1152 3.27067 10.76 3.27067 11.5562C3.27067 12.3525 2.62592 12.9972 1.82967 12.9972H1.83013Z"
              fill="rgba(var(--p1))"
            />
          </g>
          <defs>
            <clipPath>
              <rect width="10.5561" height="15" fill="white" />
            </clipPath>
          </defs>
        </svg>
      </Link>

      <div className="d-flex gap-3 align-items-center">
        <div className="side-icon bg1-color">
          <ThemeButton />
        </div>
      </div>
    </div>
  );
};
export default Topbar;
