import useCounter from "@/components/Hook/useCounter";
import Image, { StaticImageData } from "next/image";
import React from "react";
import { PiMinusBold, PiPlusBold } from "react-icons/pi";

const AwardModalCard = ({
  img,
  title,

}: {
  img: StaticImageData;
  title: string;

}) => {
  const { count, increment, discrement } = useCounter();
  console.log('img', img)
  return (
    <div className="d-flex gap-2 align-items-center justify-content-between mb-3 mb-md-4">
      <div className="d-flex gap-4 align-items-center">
        <Image src={img} alt="..." className="add-cart-img" />
        <div>
          <h5 className="fs-seven fw-medium n5-color mb-1">{title}</h5>
          <button className="text-danger">Remove</button>
        </div>
      </div>
      <div className="d-flex gap-1 align-items-center">
        <span onClick={discrement} className="fs-six n5-color cursor-pointer">
          <PiMinusBold />
        </span>
        <span className="product-count fs-six fw-semibold n5-color py-1 px-2 brn4">
          {count}
        </span>
        <span onClick={increment} className="fs-six n5-color cursor-pointer">
          <PiPlusBold />
        </span>
      </div>
    </div>
  );
};

export default AwardModalCard;
