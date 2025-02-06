import React from "react";

type HeaderProps = {
  title: string;
  date: string;
};

const Header: React.FC<HeaderProps> = ({ title, date }) => {
  return (
    <div className="heading-block">
      <div className="clearfix">
        <span style={{ float: "left" }}>
          <h4>{title} Baby Shower</h4>
        </span>
        <span style={{ float: "right" }}>
          <h4 className="text-muted">{date}</h4>
        </span>
      </div>
    </div>
  );
};

export default Header; 