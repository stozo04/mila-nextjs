"use client";

import React from "react";
import Header from "@/components/BabyShower/Header";
import Gallery from "@/components/BabyShower/Gallery";

export default function HoustonPage() {
    return (
        <div className="container py-5">
            <div className="row">
                <div className="col-12">
                    <Header title="Houston" date="May 15, 2023" />
                </div>
            </div>
            <div className="row mt-4">
                <div className="col-12">
                    <Gallery 
                        folder="houston" 
                        limit={3} 
                        key="houston-gallery"
                    />
                </div>
            </div>
        </div>
    );
};