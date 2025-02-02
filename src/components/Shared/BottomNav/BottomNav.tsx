"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { bottomNavData } from "../../../../public/data/Sidebar";

const BottomNav = () => {
  const path = usePathname();
  return (
    <div className="w-100 bgn1-color p-3 position-fixed z-3 bottom-0 d-block d-lg-none br-top-n5 box-shadow1">
      <div className="header-bottom-menu w-full">
        <ul className="d-flex gap-1 align-items-center justify-content-between">
          {bottomNavData.map(
            ({
              id,
              name,
              url,
              icon,
              numbers,
            }: {
              id: number;
              name: string;
              url: string;
              icon: React.JSX.Element;
              numbers?: number | undefined;
            }) => (
              <li
                key={id}
                className={`${path === url && "rounded-3 bg1-color"}`}
              >
                <Link
                  href={url}
                  className="d-flex justify-content-between align-items-center"
                >
                  <div
                    className={`d-flex align-items-center gap-2 fs-eight p-2 ${
                      path === url ? "n11-color" : "n5-color"
                    }`}
                  >
                    <span className="fs-five d-flex align-items-center justify-content-center">
                      {icon}
                    </span>
                    <span className="d-none d-md-block">{name}</span>
                  </div>
                  {numbers ? (
                    <span className="n5-color bg2-color fs-ten px-1 pt-1 rounded-2 me-3 d-none d-md-block">
                      {numbers}
                    </span>
                  ) : (
                    ""
                  )}
                </Link>
              </li>
            )
          )}
        </ul>
      </div>
    </div>
  );
};

export default BottomNav;
