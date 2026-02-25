import { useEffect, useState } from "react";
import api, { getApiError } from "../api";

function Measurment() {
  const [form, setForm] = useState({
    customer_id: "",
    chest: "",
    waist: "",
    shoulder: "",
    length: ""
  });
  const [measurements, setMeasurements] = useState([]);
  const [error, setError] = useState("");
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({
    customer_id: "",
    chest: "",
    waist: "",
    shoulder: "",
    length: ""
  });

  const loadMeasurements = async () => {
    try {
      const res = await api.get("/measurements");
      setMeasurements(res.data);
      setError("");
    } catch (err) {
      setError(getApiError(err, "Failed to load measurements"));
    }
  };

  useEffect(() => {
    loadMeasurements();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.customer_id || !form.chest || !form.waist || !form.shoulder || !form.length) {
      alert("All measurement fields are required");
      return;
    }

    try {
      await api.post("/measurements", form);
      alert("Measurement Added");
      setForm({
        customer_id: "",
        chest: "",
        waist: "",
        shoulder: "",
        length: ""
      });
      loadMeasurements();
    } catch (err) {
      alert(getApiError(err, "Failed to add measurement"));
    }
  };

  const startEdit = (m) => {
    setEditingId(m.id);
    setEditForm({
      customer_id: String(m.customer_id || ""),
      chest: String(m.chest ?? ""),
      waist: String(m.waist ?? ""),
      shoulder: String(m.shoulder ?? ""),
      length: String(m.length ?? "")
    });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditForm({
      customer_id: "",
      chest: "",
      waist: "",
      shoulder: "",
      length: ""
    });
  };

  const updateMeasurement = async (id) => {
    if (!editForm.customer_id || !editForm.chest || !editForm.waist || !editForm.shoulder || !editForm.length) {
      alert("All measurement fields are required");
      return;
    }

    try {
      await api.put(`/measurements/${id}`, {
        customer_id: Number(editForm.customer_id),
        chest: Number(editForm.chest),
        waist: Number(editForm.waist),
        shoulder: Number(editForm.shoulder),
        length: Number(editForm.length)
      });
      alert("Measurement Updated");
      cancelEdit();
      loadMeasurements();
    } catch (err) {
      alert(getApiError(err, "Failed to update measurement"));
    }
  };

  const deleteMeasurement = async (id) => {
    if (!window.confirm("Delete this measurement?")) {
      return;
    }

    try {
      await api.delete(`/measurements/${id}`);
      if (editingId === id) {
        cancelEdit();
      }
      loadMeasurements();
    } catch (err) {
      alert(getApiError(err, "Failed to delete measurement"));
    }
  };

  return (
    <div className="card section-card shadow-sm mt-4">
      <div className="card-body">
        <h5 className="card-title mb-3">Add Measurement</h5>
        {error && <div className="alert alert-danger py-2">{error}</div>}
        <form className="row g-3 mb-4" onSubmit={handleSubmit}>
          <div className="col-md-2">
            <label className="form-label">Customer ID</label>
            <input
              className="form-control"
              placeholder="Customer ID"
              value={form.customer_id}
              onChange={(e) => setForm({ ...form, customer_id: e.target.value })}
            />
          </div>
          <div className="col-md-2">
            <label className="form-label">Chest</label>
            <input
              className="form-control"
              placeholder="Chest"
              value={form.chest}
              onChange={(e) => setForm({ ...form, chest: e.target.value })}
            />
          </div>
          <div className="col-md-2">
            <label className="form-label">Waist</label>
            <input
              className="form-control"
              placeholder="Waist"
              value={form.waist}
              onChange={(e) => setForm({ ...form, waist: e.target.value })}
            />
          </div>
          <div className="col-md-2">
            <label className="form-label">Shoulder</label>
            <input
              className="form-control"
              placeholder="Shoulder"
              value={form.shoulder}
              onChange={(e) => setForm({ ...form, shoulder: e.target.value })}
            />
          </div>
          <div className="col-md-2">
            <label className="form-label">Length</label>
            <input
              className="form-control"
              placeholder="Length"
              value={form.length}
              onChange={(e) => setForm({ ...form, length: e.target.value })}
            />
          </div>
          <div className="col-md-2 d-flex align-items-end">
            <button type="submit" className="btn btn-primary w-100">
              Add
            </button>
          </div>
        </form>

        <div className="table-responsive">
          <table className="table table-hover align-middle mb-0">
            <thead className="table-light">
              <tr>
                <th>ID</th>
                <th>Customer ID</th>
                <th>Chest</th>
                <th>Waist</th>
                <th>Shoulder</th>
                <th>Length</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {measurements.map((m) => (
                <tr key={m.id}>
                  <td>{m.id}</td>
                  <td>
                    {editingId === m.id ? (
                      <input
                        className="form-control form-control-sm"
                        value={editForm.customer_id}
                        onChange={(e) => setEditForm({ ...editForm, customer_id: e.target.value })}
                      />
                    ) : (
                      m.customer_id
                    )}
                  </td>
                  <td>
                    {editingId === m.id ? (
                      <input
                        className="form-control form-control-sm"
                        value={editForm.chest}
                        onChange={(e) => setEditForm({ ...editForm, chest: e.target.value })}
                      />
                    ) : (
                      m.chest
                    )}
                  </td>
                  <td>
                    {editingId === m.id ? (
                      <input
                        className="form-control form-control-sm"
                        value={editForm.waist}
                        onChange={(e) => setEditForm({ ...editForm, waist: e.target.value })}
                      />
                    ) : (
                      m.waist
                    )}
                  </td>
                  <td>
                    {editingId === m.id ? (
                      <input
                        className="form-control form-control-sm"
                        value={editForm.shoulder}
                        onChange={(e) => setEditForm({ ...editForm, shoulder: e.target.value })}
                      />
                    ) : (
                      m.shoulder
                    )}
                  </td>
                  <td>
                    {editingId === m.id ? (
                      <input
                        className="form-control form-control-sm"
                        value={editForm.length}
                        onChange={(e) => setEditForm({ ...editForm, length: e.target.value })}
                      />
                    ) : (
                      m.length
                    )}
                  </td>
                  <td className="text-nowrap">
                    {editingId === m.id ? (
                      <>
                        <button
                          type="button"
                          className="btn btn-sm btn-success me-2"
                          onClick={() => updateMeasurement(m.id)}
                        >
                          Save
                        </button>
                        <button type="button" className="btn btn-sm btn-secondary" onClick={cancelEdit}>
                          Cancel
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          type="button"
                          className="btn btn-sm btn-outline-primary me-2"
                          onClick={() => startEdit(m)}
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          className="btn btn-sm btn-outline-danger"
                          onClick={() => deleteMeasurement(m.id)}
                        >
                          Delete
                        </button>
                      </>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export default Measurment;
