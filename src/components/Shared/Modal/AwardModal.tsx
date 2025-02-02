"use client";
import Image from "next/image";
const AwardModal = ({ award }: { award: any; onClose: () => void }) => {
    console.log('award: ', award);
    if (!award) return null; // Render nothing if no award is selected

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
            {award.title}
          </h1>
          <button
            type="button"
            className="btn-close btn-close-white"
            data-bs-dismiss="modal"
            aria-label="Close"
          ></button>
        </div>
        <div className="modal-body p-3 p-md-5">
        <Image
            src={award.image}
            alt={award.title}
            placeholder="blur" // Automatically generates blurDataURL
            width={800}
            height={800}
           
            />
        </div>
      </div>
    </div>
  </div>
  );
};

export default AwardModal;
