import { useState } from "react";
import api, { getApiError } from "../api";

function AddCustomer() {
  const [form, setForm] = useState({
    name: "",
    phone: "",
    address: ""
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name || !form.phone || !form.address) {
      alert("Name, phone and address are required");
      return;
    }

    try {
      await api.post("/customers", form);
      alert("Customer Added");
      setForm({ name: "", phone: "", address: "" });
    } catch (error) {
      alert(getApiError(error, "Failed to add customer"));
    }
  };

  return (
    <div className="card section-card shadow-sm mb-4">
      <div className="card-body">
        <h5 className="card-title mb-3">Add Customer</h5>
        <form className="row g-3" onSubmit={handleSubmit}>
          <div className="col-md-4">
            <label className="form-label">Name</label>
            <input
              className="form-control"
              placeholder="Enter customer name"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
          </div>
          <div className="col-md-4">
            <label className="form-label">Phone</label>
            <input
              className="form-control"
              placeholder="Enter phone number"
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
            />
          </div>
          <div className="col-md-4">
            <label className="form-label">Address</label>
            <input
              className="form-control"
              placeholder="Enter address"
              value={form.address}
              onChange={(e) => setForm({ ...form, address: e.target.value })}
            />
          </div>
          <div className="col-12">
            <button type="submit" className="btn btn-primary px-4">
              Add Customer
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default AddCustomer;
