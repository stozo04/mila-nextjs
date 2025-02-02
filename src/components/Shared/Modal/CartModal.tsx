"use client";
import Link from "next/link";
import { modalProductsData } from "../../../../public/data/AllData";
import CartModalCard from "./CartModalCard";

const CartModal = () => {
  return (
    <div
      className="modal fade"
      id="exampleModal"
      tabIndex={-1}
      aria-labelledby="exampleModalLabel"
      aria-hidden="true"
    >
      <div className="modal-dialog modal-dialog-centered">
        <div className="modal-content bgn1-color">
          <div className="modal-header bg1-color br-bottom-n5">
            <h1
              className="modal-title n11-color fs-five fw-medium"
              id="exampleModalLabel"
            >
              Your Cart
            </h1>
            <button
              type="button"
              className="btn-close btn-close-white"
              data-bs-dismiss="modal"
              aria-label="Close"
            ></button>
          </div>
          <div className="modal-body p-3 p-md-5">
            {modalProductsData.map(({ id, img, title, price }) => (
              <CartModalCard key={id} img={img} title={title} price={price} />
            ))}
          </div>
          <div className="modal-footer br-top-n5">
            <div className="w-full d-flex gap-2 align-items-center justify-content-between mb-2 mb-md-3">
              <h5 className="fs-seven fw-medium n5-color">Sub-total:</h5>
              <span className="fs-six n5-color">$220.00 USD</span>
            </div>
            <button
              data-bs-dismiss="modal"
              aria-label="Close"
              className="p-btn bg1-color w-100 rounded-pill text-center n11-color fw-medium"
            >
              <Link className="w-100 py-3 d-block" href="/checkout">
                Continue to Checkout
              </Link>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CartModal;
