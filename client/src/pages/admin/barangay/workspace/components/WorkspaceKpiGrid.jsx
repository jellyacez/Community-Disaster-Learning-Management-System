import React from "react";
import PropTypes from "prop-types";
import { 
  UserGroupIcon, 
  Certificate01Icon, 
  Activity01Icon, 
  Notification01Icon, 
  UserAdd01Icon 
} from "@hugeicons/core-free-icons";
import StatCard from "../../../system/overview/components/StatCard";

export default function WorkspaceKpiGrid({
  totalResidents,
  certifiedCount,
  activeLearners,
  pendingCount,
  localAlertsCount,
  loading = false,
}) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
      <StatCard
        icon={UserGroupIcon}
        label="Total Residents"
        value={totalResidents}
        sub="All registered locals"
        trendText="Jurisdiction"
        color="blue"
        loading={loading}
      />
      <StatCard
        icon={Certificate01Icon}
        label="Certified Safe"
        value={certifiedCount}
        sub="Passed DRRM training"
        trendText="Safe Certified"
        color="green"
        loading={loading}
      />
      <StatCard
        icon={Activity01Icon}
        label="Active Learners"
        value={activeLearners}
        sub="Recent module activity"
        trendText="Active 30d"
        color="amber"
        loading={loading}
      />
      <StatCard
        icon={UserAdd01Icon}
        label="Pending Status"
        value={pendingCount}
        sub="In training / uncertified"
        trendText="Incomplete"
        color="gray"
        loading={loading}
      />
      <StatCard
        icon={Notification01Icon}
        label="Local Advisories"
        value={localAlertsCount}
        sub="Sector announcements"
        trendText="Advisories"
        color="red"
        loading={loading}
      />
    </div>
  );
}

WorkspaceKpiGrid.propTypes = {
  totalResidents: PropTypes.number.isRequired,
  certifiedCount: PropTypes.number.isRequired,
  activeLearners: PropTypes.number.isRequired,
  pendingCount: PropTypes.number.isRequired,
  localAlertsCount: PropTypes.number.isRequired,
  loading: PropTypes.bool,
};
